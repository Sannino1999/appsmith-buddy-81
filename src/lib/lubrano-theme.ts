export const LUBRANO_THEME = {
  colors: {
    ink: "#0a0b0a",
    wine: "#160d10",
    bordeaux: "#8e1833",
    red: "#ff315b",
    mint: "#8ff5cf",
    cream: "#f8f2ea",
  },
  typography: {
    display: '"Oswald", "Arial Narrow", sans-serif',
    body: '"Nunito", ui-sans-serif, system-ui, sans-serif',
  },
  radius: {
    card: "18px",
    panel: "26px",
    pill: "999px",
  },
  principles: [
    "Use near-black/wine surfaces as the canvas.",
    "Use bordeaux/red for actions, active states and emphasis.",
    "Use mint for prices, secondary highlights and logo echoes.",
    "Use warm white for readable body copy.",
    "Use food photography as an editorial hero, never as decorative clutter.",
    "Keep mobile QR-menu navigation fast: sticky categories, large tap targets, short copy.",
  ],
} as const;

export type LubranoTheme = typeof LUBRANO_THEME;
