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
          return Response.json({ ok: false, message: "Content-Type non valido." }, { status: 415 });
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

        if (value.size <= 0 || value.size > MAX_IMAGE_BYTES) {
          return Response.json(
            { ok: false, message: "Immagine troppo grande. Limite massimo: 2 MB." },
            { status: 413 },
          );
        }

        const safeId = z.string().uuid().parse(randomUUID());
        const filename = safeId + extension;
        const uploadDir = path.resolve(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), Buffer.from(await value.arrayBuffer()));

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
