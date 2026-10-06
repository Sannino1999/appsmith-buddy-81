# Lubrano Pub — Design System

## Brand direction
Premium dark pub/braceria identity built around the supplied Lubrano logo.

### Core palette
- Ink: #0A0B0A
- Wine: #160D10
- Bordeaux: #8E1833
- Accent red: #FF315B
- Mint: #8FF5CF
- Warm cream: #F8F2EA

### Component rules
1. **Hero** — logo-led, dark photographic background, restrained bordeaux glow.
2. **Macro navigation** — two large choices (Food / Drinks), active state in bordeaux.
3. **Category navigation** — sticky horizontal pills with bordeaux active state.
4. **Dish cards** — dark layered surface, mint prices, red micro-accent.
5. **Specials** — large editorial image with red badge and mint price.
6. **Service cards** — compact actions for review, Instagram, WhatsApp and Wi-Fi.
7. **Venue CTA** — phone and maps actions with high contrast.
8. **PWA** — all primary surfaces must remain usable on a phone at 360px width.

## Reusable implementation
Design tokens are exported from `src/lib/lubrano-theme.ts`. The CSS classes prefixed `lubrano-` form the reusable page template.

## Do not
- Reintroduce yellow/gold as the primary accent.
- Put large opaque white cards behind the menu.
- Use more than one strong accent at the same time.
- Cache API/server-function responses in the service worker.
- expose credentials or admin data to the public client.
