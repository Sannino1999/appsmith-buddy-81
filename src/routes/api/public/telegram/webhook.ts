import { createFileRoute } from "@tanstack/react-router";

/**
 * The Telegram integration lives in the Supabase Edge Function
 * `telegram-webhook`. This legacy application route is intentionally disabled
 * so that Telegram cannot reach an endpoint with a different secret contract.
 */
export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async () => new Response("Use the Supabase telegram-webhook function", { status: 410 }),
    },
  },
});
