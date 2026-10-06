import { createFileRoute } from "@tanstack/react-router";
import { createCsrfMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import { requireAdmin } from "@/lib/admin-auth.server";
import { assertCapability } from "@/lib/admin-permissions";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export const Route = createFileRoute("/api/admin/upload")({
  server: {
    middleware: [createCsrfMiddleware()],
    handlers: {
      POST: async ({ request }) => {
        const admin = await requireAdmin();
        assertCapability(admin.role, "edit");

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
          return new Response(JSON.stringify({ ok: false, message: "Content-Type non valido." }, { status: 415 });
        }

        const form = await request.formData();
        const value = form.get("image");
        if (!(value instanceof File)) {
          return Response.json({ ok: false, message: "File immagine mancante." }, { status: 400 });
        }

        const extension = ALLOWED_TYPES.get(value.type);
        if (!extension) {
          return Response.json(
            { ok: false, message: "Formato non consentito. Usa JPG, PNG o WebP." },
            { status: 415 },
          );
        }

        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (contentLength > MAX_IMAGE_BYTES + 512 * 1024) {
          return Response.json(
            { ok: false, message: "Richiesta troppo grande." },
            { status: 413 },
          );
        }

        if (value.size <= 0 || value.size > MAX_IMAGE_BYTES) {
          return Response.json(
            { ok: false, message: "Immagine troppo grande. Limite massimo: 2 MB." },
            { status: 413 },
          );
        }

        const bytes = new Uint8Array(await value.arrayBuffer());
        const validSignature =
          (value.type === "image/jpeg" &&
            bytes.length >= 3 &&
            bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
          (value.type === "image/png" &&
            bytes.length >= 8 &&
            bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
            bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) ||
          (value.type === "image/webp" &&
            bytes.length >= 12 &&
            String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");

        if (!validSignature) {
          return Response.json(
            { ok: false, message: "Il contenuto del file non corrisponde al formato dichiarato." },
            { status: 415 },
          );
        }

        const safeId = z.string().uuid().parse(randomUUID());
        const filename = safeId + extension;
        const uploadDir = path.resolve(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), Buffer.from(bytes), { flag: "wx", mode: 0o644 });

        return Response.json({
          ok: true,
          url: "/uploads/" + filename,
          filename,
          bytes: value.size,
        });
      },
    },
  },
});
