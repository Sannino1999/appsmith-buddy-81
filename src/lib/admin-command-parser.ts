import type { Menu } from "./menu";

export type ParsedCommand =
  | { action: "set_price"; itemKey: string; priceEur: number; label: string }
  | { action: "set_available"; itemKey: string; available: boolean; label: string }
  | { action: "set_description"; itemKey: string; description: string; label: string }
  | { action: "reset_item"; itemKey: string; label: string }
  | { action: "set_category_available"; categoryId: string; available: boolean; label: string }
  | { action: "reset_category"; categoryId: string; label: string }
  | { action: "set_special"; title: string; description: string | null; priceEur: number | null; imageUrl: string | null }
  | { action: "remove_special" }
  | { action: "create_category"; macro: "food" | "drinks"; name: string }
  | { action: "create_item"; categoryId: string; name: string; description: string | null; priceEur: number | null }
  | { action: "set_wifi"; password: string }
  | { action: "undo_last" }
  | { action: "show_history" }
  | { action: "unknown"; reason: string; candidates?: never[] }
  | { action: "ambiguous"; reason: string; candidates: { key: string; name: string; category: string }[] };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .trim();
}

function numberFrom(value: string) {
  const cleaned = value.replace(/[€\s]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function findItems(menu: Menu, needle: string) {
  const n = normalize(needle);
  const items = menu.categories.flatMap((category) =>
    category.groups.flatMap((group) =>
      group.items.map((item) => ({
        key: item.key,
        name: item.name,
        category: category.name,
        normalizedName: normalize(item.name),
      })),
    ),
  );

  const exact = items.filter((item) => item.normalizedName === n);
  if (exact.length > 0) return exact;
  return items.filter(
    (item) =>
      item.normalizedName.includes(n) ||
      n.includes(item.normalizedName),
  );
}

function findCategory(menu: Menu, needle: string) {
  const n = normalize(needle);
  return menu.categories.filter(
    (category) =>
      normalize(category.name).includes(n) ||
      n.includes(normalize(category.name)),
  );
}

function parseSpecial(body: string): ParsedCommand {
  const parts = body.split("|").map((value) => value.trim());
  if (parts.length < 2) {
    return {
      action: "unknown",
      reason: "Per lo speciale usa: speciale | titolo | descrizione | prezzo | immagine(opzionale)",
    };
  }

  const title = parts[0];
  if (!title) return { action: "unknown", reason: "Titolo speciale mancante." };

  const description = parts[1] || null;
  const priceEur = parts[2] ? numberFrom(parts[2]) : null;
  if (parts[2] && priceEur === null) {
    return { action: "unknown", reason: "Prezzo speciale non valido." };
  }

  const imageUrl = parts[3] || null;
  if (imageUrl && !/^(https?:\/\/|\/uploads\/)[^\s]+$/i.test(imageUrl)) {
    return { action: "unknown", reason: "URL immagine non valida." };
  }

  return {
    action: "set_special",
    title,
    description,
    priceEur,
    imageUrl,
  };
}

function parseCreateItem(body: string, menu: Menu): ParsedCommand {
  const parts = body.split("|").map((value) => value.trim());
  if (parts.length < 3) {
    return {
      action: "unknown",
      reason: "Usa: aggiungi piatto | categoria | nome | prezzo | descrizione",
    };
  }

  const [categoryName, name, priceText, description] = parts;
  const categories = findCategory(menu, categoryName);
  if (categories.length !== 1) {
    return {
      action: "ambiguous",
      reason: "Categoria non univoca.",
      candidates: categories.map((category) => ({
        key: category.id,
        name: category.name,
        category: category.macro,
      })),
    };
  }

  const priceEur = numberFrom(priceText ?? "");
  return {
    action: "create_item",
    categoryId: categories[0].id,
    name: name ?? "",
    description: description || null,
    priceEur,
  };
}

export function parseAdminCommand(input: string, menu: Menu): ParsedCommand {
  const raw = input.trim();
  const lower = normalize(raw);

  if (!raw) return { action: "unknown", reason: "Scrivi un comando." };
  if (lower === "annulla" || lower === "annulla ultima azione" || lower === "undo") {
    return { action: "undo_last" };
  }
  if (lower === "storico" || lower === "modifiche") return { action: "show_history" };
  if (lower.startsWith("speciale |")) return parseSpecial(raw.slice(raw.indexOf("|") + 1));

  if (lower === "rimuovi speciale" || lower === "rimuovi lo speciale" || lower === "togli speciale") {
    return { action: "remove_special" };
  }

  if (lower.startsWith("wifi |") || lower.startsWith("wifi:")) {
    const separator = raw.includes("|") ? "|" : ":";
    const password = raw.slice(raw.indexOf(separator) + 1).trim();
    if (password.length < 8 || password.length > 63) {
      return { action: "unknown", reason: "La password Wi-Fi deve avere tra 8 e 63 caratteri." };
    }
    return { action: "set_wifi", password };
  }

  if (lower.startsWith("aggiungi categoria |")) {
    const parts = raw.slice(raw.indexOf("|") + 1).split("|").map((v) => v.trim());
    const macro = normalize(parts[0] ?? "");
    if (macro !== "food" && macro !== "cibo" && macro !== "drinks" && macro !== "bevande") {
      return { action: "unknown", reason: "Specificare CIBO o BEVANDE." };
    }
    const name = parts[1] ?? "";
    if (name.length < 2 || name.length > 80) return { action: "unknown", reason: "Nome categoria non valido." };
    return { action: "create_category", macro: macro === "food" || macro === "cibo" ? "food" : "drinks", name };
  }

  if (lower.startsWith("aggiungi piatto |")) {
    return parseCreateItem(raw.slice(raw.indexOf("|") + 1), menu);
  }

  const priceMatch = raw.match(/^\s*(?:prezzo|metti)\s+(.+?)\s+(?:a\s*)?([0-9]+(?:[,.][0-9]{1,2})?)\s*€?\s*$/i);
  if (priceMatch) {
    const needle = priceMatch[1];
    const priceEur = numberFrom(priceMatch[2]);
    if (priceEur === null || priceEur < 0 || priceEur > 1000) {
      return { action: "unknown", reason: "Prezzo non valido." };
    }
    const matches = findItems(menu, needle);
    if (matches.length !== 1) {
      return matches.length
        ? {
            action: "ambiguous",
            reason: "Ho trovato più voci compatibili.",
            candidates: matches.map((item) => ({
              key: item.key,
              name: item.name,
              category: item.category,
            })),
          }
        : { action: "unknown", reason: "Voce non trovata." };
    }
    return {
      action: "set_price",
      itemKey: matches[0].key,
      priceEur,
      label: matches[0].name,
    };
  }

  const availabilityMatch = raw.match(/^\s*(esaurito|finito|togli|nascondi|disponibile|rimetti|riattiva)\s+(.+)$/i);
  if (availabilityMatch) {
    const verb = normalize(availabilityMatch[1]);
    const needle = availabilityMatch[2];
    const categoryMatches = findCategory(menu, needle);
    if (categoryMatches.length === 1 && /nascondi|riattiva|rimetti|togli/.test(verb)) {
      return {
        action: "set_category_available",
        categoryId: categoryMatches[0].id,
        available: !/esaurito|finito|togli|nascondi/.test(verb),
        label: categoryMatches[0].name,
      };
    }

    const matches = findItems(menu, needle);
    if (matches.length !== 1) {
      return matches.length
        ? {
            action: "ambiguous",
            reason: "Ho trovato più voci compatibili.",
            candidates: matches.map((item) => ({
              key: item.key,
              name: item.name,
              category: item.category,
            })),
          }
        : { action: "unknown", reason: "Voce non trovata." };
    }
    return {
      action: "set_available",
      itemKey: matches[0].key,
      available: /disponibile|rimetti|riattiva/.test(verb),
      label: matches[0].name,
    };
  }

  const resetMatch = raw.match(/^\s*ripristina\s+(?:categoria\s+)?(.+)$/i);
  if (resetMatch) {
    const needle = resetMatch[1];
    const categories = findCategory(menu, needle);
    if (lower.includes("ripristina categoria") && categories.length === 1) {
      return { action: "reset_category", categoryId: categories[0].id, label: categories[0].name };
    }

    const matches = findItems(menu, needle);
    if (matches.length !== 1) {
      return matches.length
        ? {
            action: "ambiguous",
            reason: "Ho trovato più voci compatibili.",
            candidates: matches.map((item) => ({
              key: item.key,
              name: item.name,
              category: item.category,
            })),
          }
        : { action: "unknown", reason: "Voce non trovata." };
    }
    return { action: "reset_item", itemKey: matches[0].key, label: matches[0].name };
  }

  return {
    action: "unknown",
    reason: "Comando non riconosciuto. Usa uno dei modelli mostrati nella chat.",
  };
}
