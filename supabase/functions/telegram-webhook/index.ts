// Supabase Edge Function: Telegram webhook for menu updates.
// Secrets are read only from the Edge Function environment; never commit them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_TEXT_LENGTH = 1000;
const ITEM_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*:\d{1,4}:\d{1,4}$/;
const PRICE_PATTERN = /^(?:0|[1-9]\d{0,3})(?:[.,]\d{1,2})?$/;

const HELP = [
  "Ciao! Sono il bot del menù Lubrano.",
  "",
  "Comandi:",
  "/start o /help — mostra questo aiuto",
  "/aggiorna <item_key> prezzo=<valore>",
  "/aggiorna <item_key> descrizione=<testo>",
  "/aggiorna <item_key> disponibile=<si|no>",
  "",
  "Esempio: /aggiorna burger:0:1 prezzo=12,50",
].join("\n");

type TelegramMessage = {
  chat?: { id?: unknown };
  from?: { id?: unknown; username?: unknown };
  text?: unknown;
};

type TelegramUpdate = { update_id?: unknown; message?: TelegramMessage };
type UpdateField = "price_eur" | "description" | "available";

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function parseAllowedChatIds(): Set<string> {
  const raw = requiredSecret("TELEGRAM_ALLOWED_CHAT_IDS");
  const ids = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (ids.length === 0 || ids.some((id) => !/^-?\d{1,20}$/.test(id))) {
    throw new Error("TELEGRAM_ALLOWED_CHAT_IDS must be a comma-separated list of integer IDs");
  }
  return new Set(ids);
}

function isValidChatId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && Math.abs(value) <= 9_000_000_000_000_000;
}

function headerMatches(actual: string | null, expected: string): boolean {
  return actual !== null && actual.length === expected.length && actual === expected;
}

function parseUpdate(value: unknown): TelegramUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Telegram update");
  const update = value as Record<string, unknown>;
  if (update.update_id !== undefined && (!Number.isSafeInteger(update.update_id) || (update.update_id as number) < 0)) {
    throw new Error("Invalid update_id");
  }
  if (update.message !== undefined && (!update.message || typeof update.message !== "object" || Array.isArray(update.message))) {
    throw new Error("Invalid message");
  }
  return value as TelegramUpdate;
}

function parseCommand(text: string): { itemKey: string; field: UpdateField; value: number | string | boolean } | null {
  const match = text.match(/^\/aggiorna(?:@[^\s]+)?\s+(\S+)\s+(prezzo|prezzo_eur|descrizione|disponibile)=([\s\S]+)$/i);
  if (!match) return null;
  const [, itemKey, rawField, rawValue] = match;
  if (!ITEM_KEY_PATTERN.test(itemKey)) throw new Error("item_key non valido");
  const value = rawValue.trim();
  if (!value || value.length > MAX_TEXT_LENGTH) throw new Error("valore non valido");

  if (rawField.toLowerCase() === "prezzo" || rawField.toLowerCase() === "prezzo_eur") {
    if (!PRICE_PATTERN.test(value)) throw new Error("il prezzo deve essere un numero con massimo due decimali");
    const price = Number(value.replace(",", "."));
    if (!Number.isFinite(price) || price < 0 || price > 9999.99) throw new Error("prezzo fuori range");
    return { itemKey, field: "price_eur", value: Math.round(price * 100) / 100 };
  }
  if (rawField.toLowerCase() === "disponibile") {
    const normalized = value.toLowerCase();
    if (!["si", "sì", "yes", "true", "on", "no", "false", "off"].includes(normalized)) {
      throw new Error("disponibile deve essere si/no");
    }
    return { itemKey, field: "available", value: ["si", "sì", "yes", "true", "on"].includes(normalized) };
  }
  return { itemKey, field: "description", value };
}

async function sendTelegramMessage(token: string, chatId: number, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) console.error("Telegram sendMessage failed", response.status, await response.text());
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const token = requiredSecret("TELEGRAM_BOT_TOKEN");
    const webhookSecret = requiredSecret("TELEGRAM_WEBHOOK_SECRET");
    const allowedChatIds = parseAllowedChatIds();
    const body = await request.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BODY_BYTES) return new Response("Invalid body", { status: 400 });
    if (!headerMatches(request.headers.get("X-Telegram-Bot-Api-Secret-Token"), webhookSecret)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const update = parseUpdate(JSON.parse(new TextDecoder().decode(body)));
    const message = update.message;
    if (!message) return Response.json({ ok: true, ignored: true });
    const chatId = message.chat?.id;
    if (!isValidChatId(chatId)) return new Response("Invalid chat ID", { status: 400 });
    if (!allowedChatIds.has(String(chatId))) {
      await sendTelegramMessage(token, chatId, "Non sei autorizzato a usare questo bot.");
      return Response.json({ ok: true, ignored: true });
    }

    const text = typeof message.text === "string" ? message.text.trim() : "";
    if (!text || text.length > MAX_TEXT_LENGTH) return Response.json({ ok: true, ignored: true });
    if (/^\/(?:start|help)(?:@[^\s]+)?(?:\s|$)/i.test(text)) {
      await sendTelegramMessage(token, chatId, HELP);
      return Response.json({ ok: true });
    }

    const command = parseCommand(text);
    if (!command) {
      await sendTelegramMessage(token, chatId, `Comando non valido.\n\n${HELP}`);
      return Response.json({ ok: true });
    }

    const supabase = createClient(requiredSecret("SUPABASE_URL"), requiredSecret("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: current, error: readError } = await supabase
      .from("menu_overrides")
      .select("item_key, name, description, price_eur, available")
      .eq("item_key", command.itemKey)
      .maybeSingle();
    if (readError) throw readError;

    const row = {
      item_key: command.itemKey,
      name: current?.name ?? null,
      description: current?.description ?? null,
      price_eur: current?.price_eur ?? null,
      available: current?.available ?? true,
      updated_at: new Date().toISOString(),
    };
    row[command.field] = command.value as never;
    const { error: writeError } = await supabase.from("menu_overrides").upsert(row, { onConflict: "item_key" });
    if (writeError) throw writeError;

    await supabase.from("menu_edit_log").insert({
      actor: `telegram:${chatId}`,
      action: `set_${command.field}`,
      item_key: command.itemKey,
      details: { command: text },
    });
    await sendTelegramMessage(token, chatId, `Aggiornamento salvato per ${command.itemKey}. La pagina si aggiornerà automaticamente.`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("telegram-webhook error", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "Request rejected or update failed" }, { status: 400 });
  }
});
