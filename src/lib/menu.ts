import raw from "@/data/menu-data.json";

export type MenuItem = {
  key: string;
  name: string;
  description: string | null;
  price_eur: number | null;
  tags: string[];
  available: boolean;
};

export type MenuGroup = { name: string; items: MenuItem[] };

export type MenuCategory = {
  id: string;
  macro: string;
  name: string;
  eyebrow: string | null;
  groups: MenuGroup[];
};

export type Menu = {
  restaurant: { name: string; subtitle: string; locality: string };
  macros: { id: string; label: string }[];
  categories: MenuCategory[];
};

type RawItem = {
  id?: string;
  name: string;
  price_eur?: number | null;
  description?: string | null;
  tags?: string[];
};

type RawData = {
  restaurant: { name: string; subtitle: string; locality: string };
  macros: { id: string; label: string }[];
  categories: {
    id: string;
    macro: string;
    name: string;
    eyebrow?: string | null;
    groups: { name: string; items: RawItem[] }[];
  }[];
};

const data = raw as unknown as RawData;

/** Stable identifier for a menu entry: category:groupIndex:itemIndex */
export function itemKey(categoryId: string, groupIndex: number, itemIndex: number) {
  return `${categoryId}:${groupIndex}:${itemIndex}`;
}

export const baseMenu: Menu = {
  restaurant: data.restaurant,
  macros: data.macros,
  categories: data.categories.map((c) => ({
    id: c.id,
    macro: c.macro,
    name: c.name,
    eyebrow: c.eyebrow ?? null,
    groups: c.groups.map((g, gi) => ({
      name: g.name,
      items: g.items.map((it, ii) => ({
        key: it.id ? `${c.id}:${it.id}` : itemKey(c.id, gi, ii),
        name: it.name,
        description: it.description ?? null,
        price_eur: it.price_eur ?? null,
        tags: it.tags ?? [],
        available: true,
      })),
    })),
  })),
};

export function flatItems(menu: Menu = baseMenu) {
  return menu.categories.flatMap((c) =>
    c.groups.flatMap((g) => g.items.map((i) => ({ ...i, categoryName: c.name, groupName: g.name }))),
  );
}

export function formatPrice(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2).replace(".", ",")}€`;
}
