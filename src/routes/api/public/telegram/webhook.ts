import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

import { baseMenu, formatPrice } from "@/lib/menu";

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
  if (!res.ok) console.error(`Telegram sendMessage failed [${res.status}]: ${await res.text()}`);
}

type Command =
  | { action: "set_price"; item_key: string; price_eur: number }
  | { action: "set_description"; item_key: string; description: string }
  | { action: "set_available"; item_key: string; available: boolean }
  | { action: "reset_item"; item_key: string }
  | { action: "unknown"; reason: string };

async function interpret(text: string): Promise<Command> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");

  const catalog = baseMenu.categories.flatMap((c) =>
    c.groups.flatMap((g) =>
      g.items.map((i) => ({ key: i.key, name: i.name, category: c.name, price: i.price_eur })),
    ),
  );

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "system",
          content:
            "Sei l'assistente del menù di un pub. Ricevi un comando in italiano e il catalogo delle voci. " +
            'Rispondi SOLO con JSON: {"action":"set_price"|"set_description"|"set_available"|"reset_item"|"unknown","item_key":string,"price_eur":number,"description":string,"available":boolean,"reason":string}. ' +
            "Usa reset_item quando l'utente chiede di ripristinare/annullare le modifiche di una voce e tornare all'originale. " +
            "Scegli item_key dal catalogo con il match migliore sul nome. Se non trovi la voce o il comando non è chiaro usa action unknown con reason in italiano.",
        },
        { role: "user", content: `Catalogo: ${JSON.stringify(catalog)}\n\nComando: ${text}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI command parsing failed [${res.status}]: ${body}`);
    throw new Error(`AI command parsing failed [${res.status}]`);
  }
  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return JSON.parse(payload.choices?.[0]?.message?.content ?? '{"action":"unknown"}') as Command;
}

function itemName(key: string) {
  for (const c of baseMenu.categories)
    for (const g of c.groups) for (const i of g.items) if (i.key === key) return i.name;
  return key;
}

function baseItem(key: string) {
  for (const c of baseMenu.categories)
    for (const g of c.groups) for (const i of g.items) if (i.key === key) return i;
  return null;
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
  "↩️ RIPRISTINARE COME ALL'INIZIO",
  "• /ripristina alette di pollo — riporta una voce a prezzo e descrizione originali",
  "• /ripristina-tutto — annulla TUTTE le modifiche (chiederò conferma)",
  "• /modifiche — elenco delle modifiche attualmente attive",
  "",
  "👥 OPERATORI",
  "• /abilita 123456789 — aggiunge un operatore (o rispondi /abilita a un suo messaggio)",
  "• /operatori — elenco degli operatori autorizzati",
  "",
  "ℹ️ /help per rivedere questa guida. Ogni modifica compare sul sito entro pochi secondi.",
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

function adminName(admin: { chat_id: number | string; username: string | null; first_name?: string | null; last_name?: string | null }) {
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

        const expected = deriveSecret(apiKey);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

        const update = (await request.json()) as { message?: TelegramMessage; edited_message?: TelegramMessage };
        const message = update.message;
        const chatId = message?.chat?.id;
        const text = message?.text?.trim();
        if (!chatId || !text) return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: admins } = await supabaseAdmin
          .from("telegram_admins")
          .select("chat_id, username, first_name, last_name");
        const isAdmin = (admins ?? []).some((a) => Number(a.chat_id) === chatId);

        if (!isAdmin) {
          if ((admins ?? []).length === 0) {
            await supabaseAdmin
              .from("telegram_admins")
              .insert({
                chat_id: chatId,
                username: message?.from?.username ?? null,
                first_name: message?.from?.first_name ?? null,
                last_name: message?.from?.last_name ?? null,
              });
            await sendMessage(chatId, `Registrato come amministratore del menù.\n\n${HELP}`);
            return Response.json({ ok: true });
          }
          await sendMessage(
            chatId,
            `Non sei autorizzato a modificare il menù.\n\nIl tuo codice chat è ${chatId}: invialo a un operatore già autorizzato, che potrà scrivere /abilita ${chatId}.`,
          );
          return Response.json({ ok: true });
        }

        if (text.startsWith("/operatori")) {
          const list = (admins ?? []).map((admin) => `• ${adminName(admin)} — ${admin.chat_id}`).join("\n");
          await sendMessage(chatId, list ? `Operatori autorizzati:\n${list}` : "Nessun operatore autorizzato.");
          return Response.json({ ok: true });
        }

        if (text.startsWith("/abilita")) {
          const target = targetFromMessage(message, text);
          if (!target || Number.isNaN(target.chatId)) {
            await sendMessage(
              chatId,
              "Mandami /abilita seguito dal codice chat, oppure rispondi /abilita a un messaggio dell'operatore da abilitare.",
            );
            return Response.json({ ok: true });
          }

          const { error } = await supabaseAdmin.from("telegram_admins").upsert(
            {
              chat_id: target.chatId,
              username: target.user?.username ?? null,
              first_name: target.user?.first_name ?? null,
              last_name: target.user?.last_name ?? null,
            },
            { onConflict: "chat_id" },
          );
          if (error) {
            console.error(`Telegram admin upsert failed: ${error.message}`);
            await sendMessage(chatId, "Non riesco ad abilitare l'operatore in questo momento.");
            return Response.json({ ok: false }, { status: 500 });
          }
          await sendMessage(chatId, `Operatore abilitato: ${target.chatId}`);
          return Response.json({ ok: true });
        }

        if (text.startsWith("/start") || text.startsWith("/help")) {
          await sendMessage(chatId, HELP);
          return Response.json({ ok: true });
        }

        if (text.startsWith("/modifiche")) {
          const { data: rows } = await supabaseAdmin.from("menu_overrides").select("*");
          if (!rows || rows.length === 0) {
            await sendMessage(chatId, "Nessuna modifica attiva: il menù è identico all'originale.");
            return Response.json({ ok: true });
          }
          const lines = rows.map((r) => {
            const base = baseItem(String(r.item_key));
            const parts: string[] = [];
            if (r.price_eur != null && base && Number(r.price_eur) !== base.price_eur)
              parts.push(`prezzo ${formatPrice(base.price_eur)} → ${formatPrice(Number(r.price_eur))}`);
            if (r.description) parts.push("descrizione modificata");
            if (r.available === false) parts.push("tolta dal menù");
            return `• ${itemName(String(r.item_key))}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
          });
          await sendMessage(chatId, `Modifiche attive (${rows.length}):\n${lines.join("\n")}`);
          return Response.json({ ok: true });
        }

        if (text.startsWith("/ripristina-tutto") || text.startsWith("/ripristina_tutto")) {
          if (!/conferma/i.test(text)) {
            const { count } = await supabaseAdmin
              .from("menu_overrides")
              .select("item_key", { count: "exact", head: true });
            await sendMessage(
              chatId,
              `⚠️ Stai per annullare ${count ?? 0} modifiche e riportare tutto il menù come all'inizio.\n\nSe sei sicuro scrivi:\n/ripristina-tutto CONFERMA`,
            );
            return Response.json({ ok: true });
          }
          const { error: delErr } = await supabaseAdmin
            .from("menu_overrides")
            .delete()
            .not("item_key", "is", null);
          if (delErr) {
            console.error(`Reset all failed: ${delErr.message}`);
            await sendMessage(chatId, "Non riesco a ripristinare il menù in questo momento.");
            return Response.json({ ok: false }, { status: 500 });
          }
          await supabaseAdmin.from("menu_edit_log").insert({
            actor: message?.from?.username ? `@${message.from.username}` : String(chatId),
            action: "reset_all",
            item_key: null,
            details: { command: text },
          });
          await sendMessage(chatId, "✅ Fatto: prezzi, descrizioni e disponibilità sono tornati come all'inizio.");
          return Response.json({ ok: true });
        }


        let command: Command;
        try {
          command = await interpret(text);
        } catch {
          await sendMessage(chatId, "Non riesco a elaborare il comando in questo momento. Riprova.");
          return Response.json({ ok: true });
        }

        if (command.action === "unknown" || !("item_key" in command) || !command.item_key) {
          await sendMessage(
            chatId,
            `Non ho capito: ${"reason" in command && command.reason ? command.reason : "voce non trovata"}.\n\n${HELP}`,
          );
          return Response.json({ ok: true });
        }

        const existing = baseItem(command.item_key);
        if (!existing) {
          await sendMessage(chatId, "Voce del menù non trovata.");
          return Response.json({ ok: true });
        }

        const { data: currentRows } = await supabaseAdmin
          .from("menu_overrides")
          .select("*")
          .eq("item_key", command.item_key)
          .maybeSingle();

        const row = {
          item_key: command.item_key,
          name: currentRows?.name ?? null,
          description: currentRows?.description ?? null,
          price_eur: currentRows?.price_eur ?? existing.price_eur,
          available: currentRows?.available ?? true,
          updated_at: new Date().toISOString(),
        };

        let reply = "";
        if (command.action === "set_price") {
          row.price_eur = command.price_eur;
          reply = `Prezzo aggiornato: ${itemName(command.item_key)} → ${formatPrice(command.price_eur)}`;
        } else if (command.action === "set_description") {
          row.description = command.description;
          reply = `Descrizione aggiornata: ${itemName(command.item_key)}`;
        } else if (command.action === "set_available") {
          row.available = command.available;
          reply = `${itemName(command.item_key)} → ${command.available ? "disponibile" : "non disponibile"}`;
        }

        const { error } = await supabaseAdmin
          .from("menu_overrides")
          .upsert(row, { onConflict: "item_key" });
        if (error) {
          console.error(`Override upsert failed: ${error.message}`);
          await sendMessage(chatId, "Errore nel salvataggio della modifica.");
          return Response.json({ ok: false }, { status: 500 });
        }

        await supabaseAdmin.from("menu_edit_log").insert({
          actor: message?.from?.username ? `@${message.from.username}` : String(chatId),
          action: command.action,
          item_key: command.item_key,
          details: { command: text },
        });

        await sendMessage(chatId, reply);
        return Response.json({ ok: true });
      },
    },
  },
});
