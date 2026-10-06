import assert from "node:assert/strict";

import type { Menu } from "../src/lib/menu.ts";
import { parseAdminCommand } from "../src/lib/admin-command-parser.ts";
import { can } from "../src/lib/admin-permissions.ts";

const exactMenu: Menu = {
  restaurant: {
    name: "Lubrano Pub & Braceria",
    subtitle: "Menu",
    locality: "Napoli",
  },
  macros: [
    { id: "food", label: "Cibo" },
    { id: "drinks", label: "Bevande" },
  ],
  categories: [
    {
      id: "test",
      macro: "food",
      name: "Test",
      eyebrow: null,
      groups: [
        {
          name: "",
          items: [
            {
              key: "test:one",
              name: "Burger Uno",
              description: "desc",
              price_eur: 10,
              tags: [],
              available: true,
            },
            {
              key: "test:two",
              name: "Burger Due",
              description: "desc",
              price_eur: 11,
              tags: [],
              available: true,
            },
          ],
        },
      ],
    },
  ],
};



const price = parseAdminCommand("prezzo Burger Uno 12", exactMenu);
assert.deepEqual(price, {
  action: "set_price",
  itemKey: "test:one",
  priceEur: 12,
  label: "Burger Uno",
});

const availability = parseAdminCommand("esaurito Burger Uno", exactMenu);
assert.equal(availability.action, "set_available");
assert.equal(availability.available, false);
assert.equal(availability.itemKey, "test:one");

const ambiguous = parseAdminCommand("prezzo burger 12", exactMenu);
assert.equal(ambiguous.action, "ambiguous");
assert.equal(ambiguous.candidates.length, 2);

const reset = parseAdminCommand("ripristina Burger Uno", exactMenu);
assert.equal(reset.action, "reset_item");
assert.equal(reset.itemKey, "test:one");

const special = parseAdminCommand(
  "speciale | Burger del mese | Manzo e cheddar | 14,50 | /uploads/test.webp",
  exactMenu,
);
assert.deepEqual(special, {
  action: "set_special",
  title: "Burger del mese",
  description: "Manzo e cheddar",
  priceEur: 14.5,
  imageUrl: "/uploads/test.webp",
});

const wifi = parseAdminCommand("wifi | nuova-password", exactMenu);
assert.deepEqual(wifi, { action: "set_wifi", password: "nuova-password" });

const badWifi = parseAdminCommand("wifi | breve", exactMenu);
assert.equal(badWifi.action, "unknown");

assert.equal(can("viewer", "read"), true);
assert.equal(can("viewer", "edit"), false);
assert.equal(can("operator", "edit"), true);
assert.equal(can("operator", "manage_admin"), false);
assert.equal(can("admin", "manage_admin"), true);

console.log("Admin parser/permissions tests passed.");
