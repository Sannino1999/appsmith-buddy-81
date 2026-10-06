import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async () =>
        Response.json(
          { ok: false, message: "Telegram administration is disabled." },
          { status: 410 },
        ),
    },
  },
});
