import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

import { baseMenu, formatPrice } from "@/lib/menu";
import { isMySqlConfigured } from "@/lib/mysql.server";
import {
  countMenuOverrides,
  deleteAllMenuOverrides,
  deleteMenuOverride,
  deleteMenuOverridesByKeys,
  getAdminUserByTelegramChatId,
  getMenuOverride,
  insertAuditLog,
  listAdminUsers,
  listMenuOverrides,
  upsertMenuOverride,
  upsertMenuOverrides,
  upsertTelegramAdmin,
} from "@/lib/mysql.repository";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function deriveSecret(apiKey: string) {
  return createHash("sha256").update(`telegram-webhook:${apiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function sendMessage(chatId: number, text: string) {
  const apiKey = process.env["TELEGRAM_API_KEY"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !lovableKey) return;

  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    console.error(`Telegram sendMessage failed [${res.status}]: ${await res.text()}`);
  }
}

type Command =
  | { action: "set_price"; item_key: string; price_eur: number }
  | { action: "set_description"; item_key: string; description: string }
  | { action: "set_available"; item_key: string; available: boolean }
  | { action: "reset_item"; item_key: string }
  | { action: "set_category_available"; category_id: string; available: boolean }
  | { action: "reset_category"; category_id: string }
  | { action: "unknown"; reason: string };

async function interpret(text: string): Promise<Command> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");

  const catalog = baseMenu.categories.flatMap((c) =>
    c.groups.flatMap((g) =>
      g.items.map((i) => ({ key: i.key, name: i.name, category: c.name, price: i.price_eur })),
    ),
  );
  const categories = baseMenu.categories.map((c) => ({ id: c.id, name: c.name, macro: c.macro }));

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "system",
          content:
            "Sei l'assistente del menù di un pub. Ricevi un comando in italiano, il catalogo delle voci e l'elenco delle categorie. " +
            '{"action":"set_price"|"set_description"|"set_available"|"reset_item"|"set_category_available"|"reset_category"|"unknown","item_key":string,"category_id":string,"price_eur":number,"description":string,"available":boolean,"reason":string}. ' +
            "Usa reset_item quando l'utente chiede di ripristinare una singola voce. " +
            "Usa set_category_available con category_id e available per un'intera categoria. " +
            "Usa reset_category per riportare all'originale tutte le voci di una categoria. " +
            "Scegli item_key dal catalogo o category_id dalle categorie con il match migliore. " +
            "Se non trovi nulla o il comando non è chiaro usa action unknown con reason in italiano.",
        },
        {
          role: "user",
          content: `Categorie: ${JSON.stringify(categories)}\n\nCatalogo: ${JSON.stringify(catalog)}\n\nComando: ${text}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error(`AI command parsing failed [${res.status}]: ${await res.text()}`);
    throw new Error(`AI command parsing failed [${res.status}]`);
  }

  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return JSON.parse(payload.choices?.[0]?.message?.content ?? '{"action":"unknown"}') as Command;
}

function itemName(key: string) {
  for (const c of baseMenu.categories) {
    for (const g of c.groups) {
      for (const i of g.items) {
        if (i.key === key) return i.name;
      }
    }
  }
  return key;
}

function baseItem(key: string) {
  for (const c of baseMenu.categories) {
    for (const g of c.groups) {
      for (const i of g.items) {
        if (i.key === key) return i;
      }
    }
  }
  return null;
}

function findCategory(id: string) {
  const byId = baseMenu.categories.find((c) => c.id === id);
  if (byId) return byId;
  const needle = id.trim().toLowerCase();
  return baseMenu.categories.find((c) => c.name.toLowerCase() === needle) ?? null;
}

const HELP = [
  "👋 Ciao! Sono il bot del menù Lubrano Pub & Braceria.",
  "Scrivimi normalmente, in italiano: penso io a trovare la voce giusta.",
  "",
  "💶 CAMBIARE UN PREZZO",
  "• alette di pollo 7,50",
  "• metti il Perfect Burger a 12",
  "",
  "📝 CAMBIARE UNA DESCRIZIONE",
  "• descrizione Perfect Burger: manzo, cheddar, bacon croccante",
  "",
  "🚫 TOGLIERE / RIMETTERE UNA VOCE",
  "• togli dal menù la focaccia al pomodoro",
  "• rimetti la focaccia al pomodoro",
  "",
  "📂 TOGLIERE / RIMETTERE UNA CATEGORIA INTERA",
  "• togli tutte le focacce",
  "• nascondi i burger",
  "• rimetti gli hot dog",
  "",
  "↩️ RIPRISTINARE COME ALL'INIZIO",
  "• /ripristina alette di pollo",
  "• /ripristina-tutto — annulla TUTTE le modifiche (chiede conferma)",
  "• /modifiche — elenco delle modifiche attive",
  "",
  "👥 OPERATORI",
  "• /abilita 123456789",
  "• /operatori — elenco degli operatori autorizzati",
  "",
  "ℹ️ /help per rivedere questa guida.",
].join("\n");

type TelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  chat?: { id?: number };
  from?: TelegramUser;
  forward_from?: TelegramUser;
  reply_to_message?: { from?: TelegramUser; chat?: { id?: number } };
  text?: string;
};

type AdminRecord = {
  id?: string;
  chat_id: number | string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

async function getAdmins(): Promise<AdminRecord[]> {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  return (await listAdminUsers()).map((admin) => ({
    id: admin.id,
    chat_id: admin.telegram_chat_id,
    username: admin.username,
    first_name: admin.first_name,
    last_name: admin.last_name,
  }));
}

async function registerAdmin(input: {
  chatId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  return upsertTelegramAdmin(input);
}

async function getOverrides() {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  return listMenuOverrides();
}

async function deleteOverrides(keys?: string[]) {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  if (keys) return deleteMenuOverridesByKeys(keys);
  return deleteAllMenuOverrides();
}

async function deleteOverride(itemKey: string) {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  return deleteMenuOverride(itemKey);
}

async function upsertOverride(row: {
  item_key: string;
  name: string | null;
  description: string | null;
  price_eur: number | null;
  available: boolean;
}) {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  return upsertMenuOverride(row);
}

type AuditDetails = Record<
  string,
  string | number | boolean | null | string[] | number[] | boolean[]
>;

async function audit(actor: string, action: string, itemKey: string | null, details: AuditDetails) {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured");
  }

  const admin = await getAdminUserByTelegramChatId(Number(actor.replace(/^@/, "")));
  await insertAuditLog({
    actor,
    action,
    itemKey,
    details,
    adminUserId: admin?.id ?? null,
  });
}

function adminName(admin: AdminRecord) {
  if (admin.username) return `@${admin.username}`;
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim();
  return name || String(admin.chat_id);
}

function targetFromMessage(message: TelegramMessage, text: string) {
  const chatIdFromText = text.match(/^\/abilita(?:@\w+)?\s+(-?\d+)/i)?.[1];
  if (chatIdFromText) return { chatId: Number(chatIdFromText), user: null };

  const user = message.reply_to_message?.from ?? message.forward_from ?? null;
  const chatId = message.reply_to_message?.chat?.id ?? user?.id;
  return chatId ? { chatId, user } : null;
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["TELEGRAM_API_KEY"];
        if (!apiKey) return new Response("Not configured", { status: 500 });
        if (!isMySqlConfigured()) {
          return new Response("Database not configured", { status: 503 });
        }

        const expected = deriveSecret(apiKey);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

        const update = (await request.json()) as {
          message?: TelegramMessage;
          edited_message?: TelegramMessage;
        };
        const message = update.message;
        const chatId = message?.chat?.id;
        const text = message?.text?.trim();
        if (!chatId || !text) return Response.json({ ok: true, ignored: true });

        const admins = await getAdmins();
        const isAdmin = admins.some((admin) => Number(admin.chat_id) === chatId);

        if (!isAdmin) {
          const bootstrapCode = process.env["TELEGRAM_BOOTSTRAP_CODE"];
          const providedCode = text.replace(/^\/start(?:@\w+)?/i, "").trim();
          const canBootstrap =
            admins.length === 0 &&
            !!bootstrapCode &&
            providedCode.length === bootstrapCode.length &&
            safeEqual(providedCode, bootstrapCode);

          if (canBootstrap) {
            await registerAdmin({
              chatId,
              username: message.from?.username ?? null,
              firstName: message.from?.first_name ?? null,
              lastName: message.from?.last_name ?? null,
            });
            await sendMessage(chatId, `Registrato come amministratore del menù.\n\n${HELP}`);
            return Response.json({ ok: true });
          }

          await sendMessage(
            chatId,
            `Non sei autorizzato a modificare il menù.\n\nIl tuo codice chat è ${chatId}: invialo a un operatore già autorizzato.`,
          );
          return Response.json({ ok: true });
        }

        if (text.startsWith("/operatori")) {
          const list = admins.map((admin) => `• ${adminName(admin)} — ${admin.chat_id}`).join("\n");
          await sendMessage(
            chatId,
            list ? `Operatori autorizzati:\n${list}` : "Nessun operatore autorizzato.",
          );
          return Response.json({ ok: true });
        }

        if (text.startsWith("/abilita")) {
          const target = targetFromMessage(message, text);
          if (!target || Number.isNaN(target.chatId)) {
            await sendMessage(
              chatId,
              "Usa /abilita seguito dal codice chat o rispondi a un messaggio.",
            );
            return Response.json({ ok: true });
          }

          try {
            await registerAdmin({
              chatId: target.chatId,
              username: target.user?.username ?? null,
              firstName: target.user?.first_name ?? null,
              lastName: target.user?.last_name ?? null,
            });
            await sendMessage(chatId, `Operatore abilitato: ${target.chatId}`);
          } catch (error) {
            console.error("Telegram admin upsert failed:", error);
            await sendMessage(chatId, "Non riesco ad abilitare l'operatore in questo momento.");
            return Response.json({ ok: false }, { status: 500 });
          }
          return Response.json({ ok: true });
        }

        if (text.startsWith("/start") || text.startsWith("/help")) {
          await sendMessage(chatId, HELP);
          return Response.json({ ok: true });
        }

        if (text.startsWith("/modifiche")) {
          const rows = await getOverrides();
          if (rows.length === 0) {
            await sendMessage(chatId, "Nessuna modifica attiva: il menù è identico all'originale.");
            return Response.json({ ok: true });
          }

          const lines = rows.map((row) => {
            const base = baseItem(String(row.item_key));
            const parts: string[] = [];
            if (row.price_eur != null && base && Number(row.price_eur) !== base.price_eur) {
              parts.push(
                `prezzo ${formatPrice(base.price_eur)} → ${formatPrice(Number(row.price_eur))}`,
              );
            }
            if (row.description) parts.push("descrizione modificata");
            if (row.available === false) parts.push("tolta dal menù");
            return `• ${itemName(String(row.item_key))}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
          });
          await sendMessage(chatId, `Modifiche attive (${rows.length}):\n${lines.join("\n")}`);
          return Response.json({ ok: true });
        }

        if (text.startsWith("/ripristina-tutto") || text.startsWith("/ripristina_tutto")) {
          if (!/conferma/i.test(text)) {
            const count = isMySqlConfigured()
              ? await countMenuOverrides()
              : (await getOverrides()).length;
            await sendMessage(
              chatId,
              `⚠️ Stai per annullare ${count} modifiche e riportare tutto il menù come all'inizio.\n\nSe sei sicuro scrivi:\n/ripristina-tutto CONFERMA`,
            );
            return Response.json({ ok: true });
          }

          await deleteOverrides();
          await audit(String(chatId), "reset_all", null, { command: text });
          await sendMessage(
            chatId,
            "✅ Fatto: prezzi, descrizioni e disponibilità sono tornati come all'inizio.",
          );
          return Response.json({ ok: true });
        }

        let prompt = text;
        if (/^\/ripristina[-_]categoria/i.test(text)) {
          const rest = text.replace(/^\/ripristina[-_]categoria(?:@\w+)?/i, "").trim();
          if (!rest) {
            await sendMessage(
              chatId,
              "Scrivi /ripristina-categoria seguito dal nome della categoria.",
            );
            return Response.json({ ok: true });
          }
          prompt = `ripristina l'intera categoria all'originale: ${rest}`;
        } else if (text.startsWith("/ripristina")) {
          const rest = text.replace(/^\/ripristina(?:@\w+)?/i, "").trim();
          if (!rest) {
            await sendMessage(chatId, "Scrivi /ripristina seguito dal nome della voce.");
            return Response.json({ ok: true });
          }
          prompt = `ripristina la voce originale: ${rest}`;
        }

        let command: Command;
        try {
          command = await interpret(prompt);
        } catch {
          await sendMessage(
            chatId,
            "Non riesco a elaborare il comando in questo momento. Riprova.",
          );
          return Response.json({ ok: true });
        }

        const actor = String(chatId);

        if (command.action === "set_category_available" || command.action === "reset_category") {
          const category = findCategory(command.category_id ?? "");
          if (!category) {
            await sendMessage(chatId, "Categoria non trovata. Scrivi /help per vedere gli esempi.");
            return Response.json({ ok: true });
          }

          const items = category.groups.flatMap((g) => g.items);
          const keys = items.map((item) => item.key);

          if (command.action === "reset_category") {
            await deleteOverrides(keys);
            await audit(actor, "reset_category", category.id, {
              command: text,
              items: keys.length,
            });
            await sendMessage(
              chatId,
              `↩️ Categoria ${category.name}: ${keys.length} voci tornate all'originale.`,
            );
            return Response.json({ ok: true });
          }

          const existingRows = await getOverrides();
          const existingMap = new Map(existingRows.map((row) => [String(row.item_key), row]));
          const rows = items.map((item) => {
            const previous = existingMap.get(item.key);
            return {
              item_key: item.key,
              name: previous?.name ?? null,
              description: previous?.description ?? null,
              price_eur: previous?.price_eur ?? item.price_eur,
              available: command.available,
            };
          });

          await upsertMenuOverrides(rows);
          await audit(actor, "set_category_available", category.id, {
            command: text,
            available: command.available,
            items: keys.length,
          });

          await sendMessage(
            chatId,
            `${command.available ? "✅" : "🚫"} Categoria ${category.name}: ${keys.length} voci ${command.available ? "di nuovo disponibili" : "tolte dal menù"}.`,
          );
          return Response.json({ ok: true });
        }

        if (command.action === "unknown" || !("item_key" in command) || !command.item_key) {
          await sendMessage(
            chatId,
            `Non ho capito: ${"reason" in command && command.reason ? command.reason : "voce non trovata"}.\n\n${HELP}`,
          );
          return Response.json({ ok: true });
        }

        const existingBase = baseItem(command.item_key);
        if (!existingBase) {
          await sendMessage(chatId, "Voce del menù non trovata.");
          return Response.json({ ok: true });
        }

        if (command.action === "reset_item") {
          await deleteOverride(command.item_key);
          await audit(actor, "reset_item", command.item_key, { command: text });
          await sendMessage(
            chatId,
            `↩️ ${itemName(command.item_key)} è tornata all'originale: ${formatPrice(existingBase.price_eur)}.`,
          );
          return Response.json({ ok: true });
        }

        const current = await (async () => {
          if (isMySqlConfigured()) return getMenuOverride(command.item_key);
          const rows = await getOverrides();
          return rows.find((row) => row.item_key === command.item_key) ?? null;
        })();

        const row = {
          item_key: command.item_key,
          name: current?.name ?? null,
          description: current?.description ?? null,
          price_eur: current?.price_eur ?? existingBase.price_eur,
          available: current?.available ?? true,
        };

        let reply = "";
        if (command.action === "set_price") {
          if (
            !Number.isFinite(command.price_eur) ||
            command.price_eur < 0 ||
            command.price_eur > 1000
          ) {
            await sendMessage(chatId, "Prezzo non valido.");
            return Response.json({ ok: true });
          }
          row.price_eur = command.price_eur;
          reply = `Prezzo aggiornato: ${itemName(command.item_key)} → ${formatPrice(command.price_eur)}`;
        } else if (command.action === "set_description") {
          const description = command.description.trim();
          if (description.length > 500) {
            await sendMessage(chatId, "Descrizione troppo lunga.");
            return Response.json({ ok: true });
          }
          row.description = description;
          reply = `Descrizione aggiornata: ${itemName(command.item_key)}`;
        } else if (command.action === "set_available") {
          row.available = command.available;
          reply = `${itemName(command.item_key)} → ${command.available ? "disponibile" : "non disponibile"}`;
        }

        await upsertOverride(row);
        await audit(actor, command.action, command.item_key, { command: text });
        await sendMessage(chatId, reply);
        return Response.json({ ok: true });
      },
    },
  },
});
