import type { Menu } from "./menu";

export type ParsedCommand =
  | { action: "set_price"; itemKey: string; priceEur: number; label: string }
  | { action: "set_available"; itemKey: string; available: boolean; label: string }
  | { action: "set_description"; itemKey: string; description: string; label: string }
  | { action: "reset_item"; itemKey: string; label: string }
  | { action: "set_category_available"; categoryId: string; available: boolean; label: string }
  | { action: "reset_category"; categoryId: string; label: string }
  | {
      action: "set_special";
      title: string;
      description: string | null;
      priceEur: number | null;
      imageUrl: string | null;
    }
  | { action: "remove_special" }
  | { action: "create_category"; macro: "food" | "drinks"; name: string }
  | {
      action: "create_item";
      categoryId: string;
      name: string;
      description: string | null;
      priceEur: number | null;
    }
  | { action: "set_wifi"; password: string }
  | { action: "undo_last" }
  | { action: "show_history" }
  | { action: "unknown"; reason: string }
  | {
      action: "ambiguous";
      reason: string;
      candidates: { key: string; name: string; category: string }[];
    };

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

function splitPipe(value: string) {
  return value.split("|").map((part) => part.trim());
}

function part(parts: string[], index: number) {
  return parts[index] ?? "";
}

function findItems(menu: Menu, needle: string) {
  const normalized = normalize(needle);
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

  const exact = items.filter((item) => item.normalizedName === normalized);
  if (exact.length > 0) return exact;

  return items.filter(
    (item) => item.normalizedName.includes(normalized) || normalized.includes(item.normalizedName),
  );
}

function findCategories(menu: Menu, needle: string) {
  const normalized = normalize(needle);
  return menu.categories.filter(
    (category) =>
      normalize(category.name).includes(normalized) ||
      normalized.includes(normalize(category.name)),
  );
}

function ambiguous(
  reason: string,
  matches: { key: string; name: string; category: string }[],
): ParsedCommand {
  return { action: "ambiguous", reason, candidates: matches };
}

function parseSpecial(body: string): ParsedCommand {
  const parts = splitPipe(body);
  const title = part(parts, 0);
  const description = part(parts, 1) || null;
  const priceText = part(parts, 2);
  const imageUrl = part(parts, 3) || null;

  if (!title) {
    return { action: "unknown", reason: "Titolo speciale mancante." };
  }

  const priceEur = priceText ? numberFrom(priceText) : null;
  if (priceText && (priceEur === null || priceEur < 0 || priceEur > 1000)) {
    return { action: "unknown", reason: "Prezzo speciale non valido." };
  }

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

function parseCreateCategory(body: string): ParsedCommand {
  const parts = splitPipe(body);
  const macroText = normalize(part(parts, 0));
  const name = part(parts, 1);

  const macro =
    macroText === "food" || macroText === "cibo"
      ? "food"
      : macroText === "drinks" || macroText === "bevande"
        ? "drinks"
        : null;

  if (!macro) return { action: "unknown", reason: "Specificare CIBO o BEVANDE." };
  if (name.length < 2 || name.length > 80) {
    return { action: "unknown", reason: "Nome categoria non valido." };
  }

  return { action: "create_category", macro, name };
}

function parseCreateItem(body: string, menu: Menu): ParsedCommand {
  const parts = splitPipe(body);
  const categoryName = part(parts, 0);
  const name = part(parts, 1);
  const priceText = part(parts, 2);
  const description = part(parts, 3) || null;

  if (!categoryName || name.length < 2 || name.length > 120) {
    return {
      action: "unknown",
      reason: "Usa: aggiungi piatto | categoria | nome | prezzo | descrizione",
    };
  }

  const categories = findCategories(menu, categoryName);
  if (categories.length !== 1) {
    return ambiguous(
      "Categoria non univoca.",
      categories.map((category) => ({
        key: category.id,
        name: category.name,
        category: category.macro,
      })),
    );
  }

  const priceEur = priceText ? numberFrom(priceText) : null;
  if (priceText && (priceEur === null || priceEur < 0 || priceEur > 1000)) {
    return { action: "unknown", reason: "Prezzo non valido." };
  }

  return {
    action: "create_item",
    categoryId: categories[0]?.id ?? "",
    name,
    description,
    priceEur,
  };
}

function parseItemAvailability(
  raw: string,
  verb: string,
  needle: string,
  menu: Menu,
): ParsedCommand {
  const matches = findItems(menu, needle);
  if (matches.length !== 1) {
    return matches.length
      ? ambiguous(
          "Ho trovato più voci compatibili.",
          matches.map((item) => ({
            key: item.key,
            name: item.name,
            category: item.category,
          })),
        )
      : { action: "unknown", reason: "Voce non trovata." };
  }

  const match = matches[0];
  if (!match) return { action: "unknown", reason: "Voce non trovata." };

  return {
    action: "set_available",
    itemKey: match.key,
    available: /disponibile|rimetti|riattiva/.test(verb),
    label: match.name,
  };
}

export function parseAdminCommand(input: string, menu: Menu): ParsedCommand {
  const raw = input.trim();
  const lower = normalize(raw);

  if (!raw) return { action: "unknown", reason: "Scrivi un comando." };
  if (lower === "annulla" || lower === "annulla ultima azione" || lower === "undo") {
    return { action: "undo_last" };
  }
  if (lower === "storico" || lower === "modifiche") {
    return { action: "show_history" };
  }
  if (lower.startsWith("speciale |")) {
    return parseSpecial(raw.slice(raw.indexOf("|") + 1));
  }
  if (
    lower === "rimuovi speciale" ||
    lower === "rimuovi lo speciale" ||
    lower === "togli speciale"
  ) {
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
    return parseCreateCategory(raw.slice(raw.indexOf("|") + 1));
  }
  if (lower.startsWith("aggiungi piatto |")) {
    return parseCreateItem(raw.slice(raw.indexOf("|") + 1), menu);
  }

  const priceMatch = raw.match(
    /^\s*(?:prezzo|metti)\s+(.+?)\s+(?:a\s*)?([0-9]+(?:[,.][0-9]{1,2})?)\s*€?\s*$/i,
  );
  if (priceMatch) {
    const needle = priceMatch[1] ?? "";
    const priceText = priceMatch[2] ?? "";
    const priceEur = numberFrom(priceText);
    if (priceEur === null || priceEur < 0 || priceEur > 1000) {
      return { action: "unknown", reason: "Prezzo non valido." };
    }

    const matches = findItems(menu, needle);
    if (matches.length !== 1) {
      return matches.length
        ? ambiguous(
            "Ho trovato più voci compatibili.",
            matches.map((item) => ({
              key: item.key,
              name: item.name,
              category: item.category,
            })),
          )
        : { action: "unknown", reason: "Voce non trovata." };
    }

    const match = matches[0];
    if (!match) return { action: "unknown", reason: "Voce non trovata." };

    return {
      action: "set_price",
      itemKey: match.key,
      priceEur,
      label: match.name,
    };
  }

  const availabilityMatch = raw.match(
    /^\s*(esaurito|finito|togli|nascondi|disponibile|rimetti|riattiva)\s+(.+)$/i,
  );
  if (availabilityMatch) {
    const verb = normalize(availabilityMatch[1] ?? "");
    const needle = availabilityMatch[2] ?? "";

    const categoryMatches = findCategories(menu, needle);
    if (categoryMatches.length === 1 && /(nascondi|riattiva|rimetti|togli)/.test(verb)) {
      const category = categoryMatches[0];
      if (!category) return { action: "unknown", reason: "Categoria non trovata." };
      return {
        action: "set_category_available",
        categoryId: category.id,
        available: !/(esaurito|finito|togli|nascondi)/.test(verb),
        label: category.name,
      };
    }

    return parseItemAvailability(raw, verb, needle, menu);
  }

  const resetMatch = raw.match(/^\s*ripristina\s+(?:categoria\s+)?(.+)$/i);
  if (resetMatch) {
    const needle = resetMatch[1] ?? "";
    if (lower.includes("ripristina categoria")) {
      const categories = findCategories(menu, needle);
      if (categories.length === 1) {
        const category = categories[0];
        if (category) {
          return {
            action: "reset_category",
            categoryId: category.id,
            label: category.name,
          };
        }
      }
    }

    const matches = findItems(menu, needle);
    if (matches.length !== 1) {
      return matches.length
        ? ambiguous(
            "Ho trovato più voci compatibili.",
            matches.map((item) => ({
              key: item.key,
              name: item.name,
              category: item.category,
            })),
          )
        : { action: "unknown", reason: "Voce non trovata." };
    }

    const match = matches[0];
    if (!match) return { action: "unknown", reason: "Voce non trovata." };
    return { action: "reset_item", itemKey: match.key, label: match.name };
  }

  return {
    action: "unknown",
    reason: "Comando non riconosciuto. Usa uno dei modelli mostrati nella chat.",
  };
}
