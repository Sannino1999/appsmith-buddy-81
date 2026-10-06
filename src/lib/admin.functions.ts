import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { authenticateAdmin, getCurrentAdmin, logoutAdmin } from "./admin-auth.server";
import { assertCapability } from "./admin-permissions";
import { parseAdminCommand, type ParsedCommand } from "./admin-command-parser";
import { baseMenu } from "./menu";
import {
  createCustomCategory,
  createCustomItem,
  deleteCategoryOverride,
  deleteCustomCategory,
  deleteCustomItem,
  deleteMenuOverride,
  getActiveSpecial,
  getCategoryOverride,
  getLatestAuditLogForAdmin,
  getMenuOverride,
  insertAuditLog,
  insertChatMessage,
  listAuditLog,
  listChatMessages,
  listMenuOverrides,
  upsertCategoryOverride,
  upsertMenuOverride,
  upsertSpecial,
  setSetting,
  deactivateAllSpecials,
} from "./mysql.repository";
import { isMySqlConfigured } from "./mysql.server";

const pendingConfirmations = new Map<string, { command: string; expiresAt: number }>();

const loginInput = z.object({
  username: z.string().trim().min(1).max(190),
  password: z.string().min(1).max(72),
});

function ensureDatabase() {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL non configurato.");
  }
}

function itemFromKey(itemKey: string) {
  for (const category of baseMenu.categories) {
    for (const group of category.groups) {
      const item = group.items.find((candidate) => candidate.key === itemKey);
      if (item) return { item, category };
    }
  }
  return null;
}

function snapshotOverride(value: Awaited<ReturnType<typeof getMenuOverride>>) {
  if (!value) return null;
  return {
    item_key: value.item_key,
    name: value.name,
    description: value.description,
    price_eur: value.price_eur,
    available: value.available,
  };
}

function safeCommandText(command: string, parsed: ParsedCommand) {
  return parsed.action === "set_wifi" ? "wifi | [REDACTED]" : command;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginInput.parse(data))
  .handler(async ({ data }) => {
    ensureDatabase();
    return authenticateAdmin(data);
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  ensureDatabase();
  return logoutAdmin();
});

export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  ensureDatabase();
  const admin = await getCurrentAdmin();
  return { authenticated: !!admin, admin };
});

export const adminChatData = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  const admin = await getCurrentAdmin();
  if (!admin) return { authenticated: false as const };

  ensureDatabase();
  assertCapability(admin.role, "read");

  const [messages, history, overrides] = await Promise.all([
    listChatMessages(admin.id, 100),
    listAuditLog(100),
    listMenuOverrides(),
  ]);

  return {
    authenticated: true as const,
    admin,
    messages: messages.reverse().map((message) => ({
      id: message.id,
      role: message.role,
      message: message.message,
      createdAt: message.created_at.toISOString(),
    })),
    history: history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      itemKey: entry.item_key,
      details: entry.details,
      createdAt: entry.created_at.toISOString(),
    })),
    activeOverrides: overrides.map((override) => ({
      itemKey: override.item_key,
      name: itemFromKey(override.item_key)?.item.name ?? override.item_key,
      priceEur: override.price_eur,
      available: override.available,
    })),
  };
});

export const previewAdminCommand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ command: z.string().trim().min(1).max(500) }).parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await getCurrentAdmin();
    if (!admin) throw new Response("Unauthorized", { status: 401 });
    assertCapability(admin.role, "edit");
    ensureDatabase();

    const parsed = parseAdminCommand(data.command, baseMenu);
    const requiresConfirmation = !["unknown", "ambiguous", "show_history"].includes(parsed.action);
    if (requiresConfirmation) {
      pendingConfirmations.set(admin.id, {
        command: data.command,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }
    return {
      parsed,
      safeCommand: safeCommandText(data.command, parsed),
      requiresConfirmation,
    };
  });

export const executeAdminCommand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        command: z.string().trim().min(1).max(500),
        confirm: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const admin = await getCurrentAdmin();
    if (!admin) throw new Response("Unauthorized", { status: 401 });
    assertCapability(admin.role, "edit");
    ensureDatabase();

    const parsed = parseAdminCommand(data.command, baseMenu);
    const commandText = safeCommandText(data.command, parsed);
    const readOnly = parsed.action === "show_history";
    if (!readOnly) {
      const pending = pendingConfirmations.get(admin.id);
      const validPending =
        data.confirm &&
        pending &&
        pending.command === data.command &&
        pending.expiresAt > Date.now();
      if (!validPending) {
        return {
          ok: false as const,
          message: "Conferma obbligatoria: crea una nuova anteprima per questa modifica.",
          parsed,
          requiresConfirmation: true as const,
        };
      }
      pendingConfirmations.delete(admin.id);
    }

    if (parsed.action === "unknown") {
      await insertChatMessage({
        adminUserId: admin.id,
        role: "user",
        message: commandText,
      });
      await insertChatMessage({
        adminUserId: admin.id,
        role: "assistant",
        message: "Non ho riconosciuto il comando. Usa uno dei modelli guidati.",
      });
      return { ok: false as const, message: parsed.reason, parsed };
    }

    if (parsed.action === "ambiguous") {
      return { ok: false as const, message: parsed.reason, parsed };
    }

    await insertChatMessage({
      adminUserId: admin.id,
      role: "user",
      message: commandText,
    });

    if (parsed.action === "show_history") {
      const history = await listAuditLog(50);
      const message =
        history.length === 0
          ? "Non ci sono ancora modifiche registrate."
          : "Ultime modifiche:\n" +
            history
              .slice(0, 10)
              .map((entry) => "• " + entry.action + (entry.item_key ? " — " + entry.item_key : ""))
              .join("\n");
      await insertChatMessage({ adminUserId: admin.id, role: "assistant", message });
      return { ok: true as const, message, parsed };
    }

    if (parsed.action === "undo_last") {
      const latest = await getLatestAuditLogForAdmin(admin.id);
      if (!latest) {
        const message = "Non ci sono azioni da annullare.";
        await insertChatMessage({ adminUserId: admin.id, role: "assistant", message });
        return { ok: true as const, message, parsed };
      }

      const details = JSON.parse(latest.details) as {
        undoAction?: string;
        before?: unknown;
        after?: unknown;
      };

      if (details.undoAction === "item_override" && latest.item_key) {
        const before = details.before as {
          name: string | null;
          description: string | null;
          price_eur: number | null;
          available: boolean;
        } | null;
        if (!before) {
          await deleteMenuOverride(latest.item_key);
        } else {
          await upsertMenuOverride({ item_key: latest.item_key, ...before });
        }
      } else if (details.undoAction === "category_override" && latest.item_key) {
        const before = details.before as { name: string | null; available: boolean } | null;
        if (!before) {
          await deleteCategoryOverride(latest.item_key);
        } else {
          await upsertCategoryOverride(latest.item_key, before.available, before.name);
        }
      } else if (details.undoAction === "special") {
        const before = details.before as {
          id: string;
          title: string;
          description: string | null;
          price_eur: number | null;
          image_url: string | null;
          item_key: string | null;
        } | null;
        if (!before) {
          await deactivateAllSpecials();
        } else {
          await (await import("./mysql.repository")).deactivateAllSpecials();
          await upsertSpecial({
            id: before.id,
            title: before.title,
            description: before.description,
            priceEur: before.price_eur,
            imageUrl: before.image_url,
            itemKey: before.item_key,
          });
        }
      } else if (details.undoAction === "custom_item") {
        const after = details.after as { id: string } | null;
        if (after?.id) await deleteCustomItem(after.id);
      } else if (details.undoAction === "custom_category") {
        const after = details.after as { id: string } | null;
        if (after?.id) await deleteCustomCategory(after.id);
      } else if (details.undoAction === "wifi") {
        const message =
          "Per sicurezza non conservo la vecchia password Wi-Fi nell'audit log. Imposta manualmente la precedente.";
        await insertChatMessage({ adminUserId: admin.id, role: "assistant", message });
        return { ok: false as const, message, parsed };
      } else {
        const message = "L'ultima azione non è reversibile automaticamente.";
        await insertChatMessage({ adminUserId: admin.id, role: "assistant", message });
        return { ok: false as const, message, parsed };
      }

      const message = "✅ Ultima azione annullata.";
      await insertAuditLog({
        actor: admin.username ?? admin.id,
        adminUserId: admin.id,
        action: "undo",
        itemKey: latest.item_key,
        details: { sourceAuditId: latest.id },
      });
      await insertChatMessage({ adminUserId: admin.id, role: "assistant", message });
      return { ok: true as const, message, parsed };
    }

    let message = "Modifica applicata.";
    const action = parsed.action;
    let itemKey: string | null = null;
    let details: Record<string, unknown> = { command: commandText };

    if (
      parsed.action === "set_price" ||
      parsed.action === "set_available" ||
      parsed.action === "set_description" ||
      parsed.action === "reset_item"
    ) {
      const target = await getMenuOverride(parsed.itemKey);
      const base = itemFromKey(parsed.itemKey)?.item;
      if (!base) return { ok: false as const, message: "Voce non trovata.", parsed };
      const before = snapshotOverride(target);
      itemKey = parsed.itemKey;

      if (parsed.action === "reset_item") {
        await deleteMenuOverride(parsed.itemKey);
        message = "↩️ " + base.name + " ripristinato.";
      } else {
        const row = {
          item_key: parsed.itemKey,
          name: target?.name ?? null,
          description: target?.description ?? null,
          price_eur: target?.price_eur ?? base.price_eur,
          available: target?.available ?? true,
        };
        if (parsed.action === "set_price") row.price_eur = parsed.priceEur;
        if (parsed.action === "set_available") row.available = parsed.available;
        if (parsed.action === "set_description") row.description = parsed.description;
        await upsertMenuOverride(row);
        message =
          parsed.action === "set_price"
            ? "✅ Prezzo aggiornato: " + base.name
            : parsed.action === "set_available"
              ? (parsed.available ? "✅ Disponibile: " : "🚫 Non disponibile: ") + base.name
              : "✅ Descrizione aggiornata: " + base.name;
      }

      details = {
        ...details,
        undoAction: "item_override",
        before,
        after: snapshotOverride(await getMenuOverride(parsed.itemKey)),
      };
    } else if (parsed.action === "set_category_available" || parsed.action === "reset_category") {
      const previous = await getCategoryOverride(parsed.categoryId);
      const category = baseMenu.categories.find((entry) => entry.id === parsed.categoryId);
      if (!category) return { ok: false as const, message: "Categoria non trovata.", parsed };

      if (parsed.action === "reset_category") {
        await deleteCategoryOverride(parsed.categoryId);
        message = "↩️ Categoria " + category.name + " ripristinata.";
      } else {
        await upsertCategoryOverride(parsed.categoryId, parsed.available, previous?.name ?? null);
        message =
          (parsed.available ? "✅ Categoria riattivata: " : "🚫 Categoria nascosta: ") +
          category.name;
      }

      itemKey = parsed.categoryId;
      details = {
        ...details,
        undoAction: "category_override",
        before: previous
          ? {
              name: previous.name,
              available: previous.available === true || previous.available === 1,
            }
          : null,
        after: await getCategoryOverride(parsed.categoryId),
      };
    } else if (parsed.action === "set_special") {
      const before = await getActiveSpecial();
      await (await import("./mysql.repository")).deactivateAllSpecials();
      const id = before?.id ?? randomUUID();
      await upsertSpecial({
        id,
        title: parsed.title,
        description: parsed.description,
        priceEur: parsed.priceEur,
        imageUrl: parsed.imageUrl,
        itemKey: null,
      });
      message = "⭐ Speciale del mese aggiornato: " + parsed.title;
      details = {
        ...details,
        undoAction: "special",
        before,
        after: await getActiveSpecial(),
      };
    } else if (parsed.action === "remove_special") {
      const before = await getActiveSpecial();
      await (await import("./mysql.repository")).deactivateAllSpecials();
      message = "✅ Speciale del mese rimosso.";
      details = { ...details, undoAction: "special", before, after: null };
    } else if (parsed.action === "create_category") {
      const id = "custom-" + randomUUID();
      await createCustomCategory({
        id,
        macro: parsed.macro,
        name: parsed.name,
      });
      message = "✅ Categoria extra creata: " + parsed.name;
      details = { ...details, undoAction: "custom_category", before: null, after: { id } };
    } else if (parsed.action === "create_item") {
      const id = randomUUID();
      const customItemKey = "custom:" + id;
      await createCustomItem({
        id,
        itemKey: customItemKey,
        categoryId: parsed.categoryId,
        name: parsed.name,
        description: parsed.description,
        priceEur: parsed.priceEur,
      });
      itemKey = customItemKey;
      message = "✅ Piatto extra creato: " + parsed.name;
      details = {
        ...details,
        undoAction: "custom_item",
        before: null,
        after: { id, itemKey: customItemKey },
      };
    } else if (parsed.action === "set_wifi") {
      await setSetting("wifi_password", parsed.password);
      message = "✅ Password Wi-Fi aggiornata.";
      details = { ...details, undoAction: "wifi", secretChanged: true };
    }

    await insertAuditLog({
      actor: admin.username ?? admin.id,
      adminUserId: admin.id,
      action,
      itemKey,
      details,
    });
    await insertChatMessage({ adminUserId: admin.id, role: "assistant", message });

    return { ok: true as const, message, parsed };
  });
