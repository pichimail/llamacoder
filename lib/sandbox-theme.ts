/** CSS variables injected into Sandpack previews so generated shadcn components theme correctly.
 * Sandpack's browser PostCSS compiler crashes on Tailwind v4-style `@import "tailwindcss"`
 * with "Path must be a string. Received null". Keep this file plain CSS only.
 *
 * Phase 1: five premium token sets replace the single flat gray palette.
 * `getThemeCSS(styleId)` returns the full globals CSS for a preset.
 * `SANDBOX_GLOBALS_CSS` remains exported (defaults to DEFAULT_STYLE_ID) for
 * backward compatibility with existing imports.
 */

export type SandboxStyleId =
  | "modern-saas"
  | "editorial-dark"
  | "warm-neutral"
  | "vibrant-accent"
  | "glassmorphism"
  | "brutalist"
  | "oled-dark"
  | "liquid-metal"
  | "neon-tokyo"
  | "terra-earth"
  | "minimal-mono"
  | "shadcn-default";

export const DEFAULT_STYLE_ID: SandboxStyleId = "glassmorphism";

export const SANDBOX_STYLE_PRESETS: Array<{
  id: SandboxStyleId;
  label: string;
  swatch: string; // hex used for the picker chip dot
  description: string;
}> = [
  { id: "modern-saas", label: "Modern SaaS", swatch: "#6366f1", description: "Indigo accents, true dark mode, clean product UI" },
  { id: "editorial-dark", label: "Editorial", swatch: "#facc15", description: "Amber on warm dark, magazine-grade typography" },
  { id: "warm-neutral", label: "Warm", swatch: "#f97316", description: "Orange accent on soft cream neutrals" },
  { id: "vibrant-accent", label: "Vibrant", swatch: "#8b5cf6", description: "Violet accent, energetic product feel" },
  { id: "glassmorphism", label: "Glassmorphism", swatch: "#0ea5e9", description: "Cyan accent, translucent blurred surfaces" },
  { id: "brutalist", label: "Brutalist", swatch: "#000000", description: "Raw black borders, hard shadows, no rounded corners" },
  { id: "oled-dark", label: "OLED Dark", swatch: "#22d3ee", description: "True black surfaces, high-contrast cyan accents" },
  { id: "liquid-metal", label: "Liquid Metal", swatch: "#94a3b8", description: "Chrome-toned neutrals, cool steel accent" },
  { id: "neon-tokyo", label: "Neon Tokyo", swatch: "#ec4899", description: "Magenta and cyan neon on near-black" },
  { id: "terra-earth", label: "Terra", swatch: "#84a07c", description: "Earthy greens and clay tones, natural warmth" },
  { id: "minimal-mono", label: "Minimal Mono", swatch: "#525252", description: "Grayscale-only, zero color accent, pure typography" },
  { id: "shadcn-default", label: "shadcn/ui Default", swatch: "#18181b", description: "Stock shadcn zinc palette, exactly as documented" },
];

export function isSandboxStyleId(value: unknown): value is SandboxStyleId {
  return (
    typeof value === "string" &&
    SANDBOX_STYLE_PRESETS.some((preset) => preset.id === value)
  );
}

/* Shared structural CSS appended to every theme */
const SHARED_BASE_CSS = `
* {
  box-sizing: border-box;
  border-color: hsl(var(--border));
}

html,
body,
#root {
  min-height: 100%;
  margin: 0;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea,
select {
  font: inherit;
}

/* Three.js / WebGL canvas support: never strip or squash canvases */
canvas {
  display: block;
  max-width: 100%;
}
`;

const CHART_VARS_LIGHT = `
  --chart-1: 243 75% 59%;
  --chart-2: 199 89% 48%;
  --chart-3: 262 83% 58%;
  --chart-4: 173 58% 39%;
  --chart-5: 43 74% 66%;`;

const CHART_VARS_DARK = `
  --chart-1: 243 75% 65%;
  --chart-2: 199 89% 55%;
  --chart-3: 262 83% 66%;
  --chart-4: 160 60% 45%;
  --chart-5: 43 74% 66%;`;

const SIDEBAR_VARS = (accent: string) => `
  --sidebar-background: var(--card);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: ${accent};
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: var(--muted);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: ${accent};`;

/* ---------------- MODERN SAAS (default) ---------------- */
const MODERN_SAAS_CSS = `
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 4%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 4%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 4%;
  --primary: 243 75% 59%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 5% 96%;
  --secondary-foreground: 240 6% 10%;
  --muted: 240 5% 96%;
  --muted-foreground: 240 4% 46%;
  --accent: 243 75% 59%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 6% 90%;
  --input: 240 6% 90%;
  --ring: 243 75% 59%;
  --radius: 0.75rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("243 75% 59%")}
}

.dark {
  --background: 240 10% 4%;
  --foreground: 0 0% 98%;
  --card: 240 6% 8%;
  --card-foreground: 0 0% 98%;
  --popover: 240 6% 7%;
  --popover-foreground: 0 0% 98%;
  --primary: 243 75% 63%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 4% 14%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 4% 14%;
  --muted-foreground: 240 5% 64%;
  --accent: 243 75% 63%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 4% 16%;
  --input: 240 4% 16%;
  --ring: 243 75% 63%;${CHART_VARS_DARK}${SIDEBAR_VARS("243 75% 63%")}
}
`;

/* ---------------- EDITORIAL DARK ---------------- */
const EDITORIAL_DARK_CSS = `
:root {
  --background: 40 20% 97%;
  --foreground: 30 8% 10%;
  --card: 0 0% 100%;
  --card-foreground: 30 8% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 30 8% 10%;
  --primary: 42 90% 45%;
  --primary-foreground: 30 8% 8%;
  --secondary: 40 12% 92%;
  --secondary-foreground: 30 8% 12%;
  --muted: 40 12% 92%;
  --muted-foreground: 30 6% 42%;
  --accent: 42 90% 45%;
  --accent-foreground: 30 8% 8%;
  --destructive: 0 74% 50%;
  --destructive-foreground: 0 0% 98%;
  --border: 35 10% 86%;
  --input: 35 10% 86%;
  --ring: 42 90% 45%;
  --radius: 0.5rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("42 90% 45%")}
}

.dark {
  --background: 30 6% 7%;
  --foreground: 40 18% 94%;
  --card: 30 4% 10%;
  --card-foreground: 40 18% 94%;
  --popover: 30 4% 9%;
  --popover-foreground: 40 18% 94%;
  --primary: 47 96% 53%;
  --primary-foreground: 30 8% 8%;
  --secondary: 30 4% 14%;
  --secondary-foreground: 40 18% 94%;
  --muted: 30 4% 14%;
  --muted-foreground: 35 8% 62%;
  --accent: 47 96% 53%;
  --accent-foreground: 30 8% 8%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 30 4% 16%;
  --input: 30 4% 16%;
  --ring: 47 96% 53%;${CHART_VARS_DARK}${SIDEBAR_VARS("47 96% 53%")}
}
`;

/* ---------------- WARM NEUTRAL ---------------- */
const WARM_NEUTRAL_CSS = `
:root {
  --background: 40 33% 98%;
  --foreground: 24 10% 12%;
  --card: 40 20% 96%;
  --card-foreground: 24 10% 12%;
  --popover: 40 25% 97%;
  --popover-foreground: 24 10% 12%;
  --primary: 25 95% 53%;
  --primary-foreground: 0 0% 100%;
  --secondary: 36 20% 92%;
  --secondary-foreground: 24 10% 14%;
  --muted: 36 20% 92%;
  --muted-foreground: 25 8% 44%;
  --accent: 25 95% 53%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 33 15% 87%;
  --input: 33 15% 87%;
  --ring: 25 95% 53%;
  --radius: 0.75rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("25 95% 53%")}
}

.dark {
  --background: 24 12% 7%;
  --foreground: 40 25% 94%;
  --card: 24 10% 10%;
  --card-foreground: 40 25% 94%;
  --popover: 24 10% 9%;
  --popover-foreground: 40 25% 94%;
  --primary: 25 95% 58%;
  --primary-foreground: 24 12% 6%;
  --secondary: 24 8% 15%;
  --secondary-foreground: 40 25% 94%;
  --muted: 24 8% 15%;
  --muted-foreground: 30 10% 62%;
  --accent: 25 95% 58%;
  --accent-foreground: 24 12% 6%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 24 8% 17%;
  --input: 24 8% 17%;
  --ring: 25 95% 58%;${CHART_VARS_DARK}${SIDEBAR_VARS("25 95% 58%")}
}
`;

/* ---------------- VIBRANT ACCENT ---------------- */
const VIBRANT_ACCENT_CSS = `
:root {
  --background: 270 5% 99%;
  --foreground: 270 10% 8%;
  --card: 0 0% 100%;
  --card-foreground: 270 10% 8%;
  --popover: 0 0% 100%;
  --popover-foreground: 270 10% 8%;
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 265 15% 95%;
  --secondary-foreground: 270 10% 10%;
  --muted: 265 15% 95%;
  --muted-foreground: 265 6% 45%;
  --accent: 262 83% 58%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 265 12% 89%;
  --input: 265 12% 89%;
  --ring: 262 83% 58%;
  --radius: 0.75rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("262 83% 58%")}
}

.dark {
  --background: 270 15% 5%;
  --foreground: 265 20% 96%;
  --card: 270 12% 9%;
  --card-foreground: 265 20% 96%;
  --popover: 270 12% 8%;
  --popover-foreground: 265 20% 96%;
  --primary: 262 83% 66%;
  --primary-foreground: 0 0% 100%;
  --secondary: 268 10% 15%;
  --secondary-foreground: 265 20% 96%;
  --muted: 268 10% 15%;
  --muted-foreground: 265 10% 64%;
  --accent: 262 83% 66%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 268 10% 17%;
  --input: 268 10% 17%;
  --ring: 262 83% 66%;${CHART_VARS_DARK}${SIDEBAR_VARS("262 83% 66%")}
}
`;

/* ---------------- GLASSMORPHISM ----------------
 * shadcn tokens expect plain HSL triplets consumable via hsl(var(--x)).
 * Translucency for cards is delivered via extra utility CSS below rather
 * than an alpha-suffixed token (which would break hsl(var(--card)) usage).
 */
const GLASSMORPHISM_CSS = `
:root {
  --background: 220 20% 97%;
  --foreground: 220 15% 10%;
  --card: 0 0% 100%;
  --card-foreground: 220 15% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 15% 10%;
  --primary: 199 89% 48%;
  --primary-foreground: 0 0% 100%;
  --secondary: 215 25% 94%;
  --secondary-foreground: 220 15% 12%;
  --muted: 215 25% 94%;
  --muted-foreground: 218 10% 44%;
  --accent: 199 89% 48%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 216 20% 88%;
  --input: 216 20% 88%;
  --ring: 199 89% 48%;
  --radius: 1rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("199 89% 48%")}
}

.dark {
  --background: 220 25% 6%;
  --foreground: 214 25% 95%;
  --card: 220 20% 11%;
  --card-foreground: 214 25% 95%;
  --popover: 220 20% 10%;
  --popover-foreground: 214 25% 95%;
  --primary: 199 89% 55%;
  --primary-foreground: 220 25% 5%;
  --secondary: 218 15% 16%;
  --secondary-foreground: 214 25% 95%;
  --muted: 218 15% 16%;
  --muted-foreground: 215 12% 64%;
  --accent: 199 89% 55%;
  --accent-foreground: 220 25% 5%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 218 15% 19%;
  --input: 218 15% 19%;
  --ring: 199 89% 55%;${CHART_VARS_DARK}${SIDEBAR_VARS("199 89% 55%")}
}

/* Glass surfaces: translucent card backgrounds + blur. Applied to shadcn
 * card-style surfaces via attribute/class heuristics that generated apps use. */
.glass,
[class*="bg-card"],
[data-slot="card"] {
  background-color: hsl(var(--card) / 0.6) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
`;

/* ---------------- BRUTALIST ---------------- */
const BRUTALIST_CSS = `
:root {
  --background: 0 0% 98%;
  --foreground: 0 0% 4%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 4%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 4%;
  --primary: 0 0% 4%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 92%;
  --secondary-foreground: 0 0% 4%;
  --muted: 0 0% 92%;
  --muted-foreground: 0 0% 30%;
  --accent: 48 96% 53%;
  --accent-foreground: 0 0% 4%;
  --destructive: 0 84% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 4%;
  --input: 0 0% 4%;
  --ring: 0 0% 4%;
  --radius: 0rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("0 0% 4%")}
}

.dark {
  --background: 0 0% 6%;
  --foreground: 0 0% 98%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 10%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 6%;
  --secondary: 0 0% 16%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 16%;
  --muted-foreground: 0 0% 65%;
  --accent: 48 96% 53%;
  --accent-foreground: 0 0% 6%;
  --destructive: 0 70% 55%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 98%;
  --input: 0 0% 98%;
  --ring: 0 0% 98%;${CHART_VARS_DARK}${SIDEBAR_VARS("0 0% 98%")}
}

/* Hard shadows, thick borders, zero radius — the brutalist signature. */
[data-slot="card"], .rounded-xl, .rounded-2xl, .rounded-lg {
  border-radius: 0 !important;
  border-width: 2px !important;
  box-shadow: 4px 4px 0 0 hsl(var(--foreground)) !important;
}
button, [data-slot="button"] {
  border-radius: 0 !important;
  border-width: 2px !important;
}
`;

/* ---------------- OLED DARK ---------------- */
const OLED_DARK_CSS = `
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 5%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 5%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 5%;
  --primary: 189 94% 43%;
  --primary-foreground: 0 0% 5%;
  --secondary: 0 0% 95%;
  --secondary-foreground: 0 0% 5%;
  --muted: 0 0% 95%;
  --muted-foreground: 0 0% 40%;
  --accent: 189 94% 43%;
  --accent-foreground: 0 0% 5%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 88%;
  --input: 0 0% 88%;
  --ring: 189 94% 43%;
  --radius: 0.5rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("189 94% 43%")}
}

.dark {
  --background: 0 0% 0%;
  --foreground: 0 0% 98%;
  --card: 0 0% 3%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 2%;
  --popover-foreground: 0 0% 98%;
  --primary: 189 94% 55%;
  --primary-foreground: 0 0% 0%;
  --secondary: 0 0% 9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 9%;
  --muted-foreground: 0 0% 60%;
  --accent: 189 94% 55%;
  --accent-foreground: 0 0% 0%;
  --destructive: 0 74% 50%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 14%;
  --input: 0 0% 14%;
  --ring: 189 94% 55%;${CHART_VARS_DARK}${SIDEBAR_VARS("189 94% 55%")}
}

/* True-black OLED surfaces: pure #000 background in dark mode, not a gray. */
.dark body { background-color: #000000; }
`;

/* ---------------- LIQUID METAL ---------------- */
const LIQUID_METAL_CSS = `
:root {
  --background: 220 14% 96%;
  --foreground: 222 20% 12%;
  --card: 0 0% 100%;
  --card-foreground: 222 20% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 20% 12%;
  --primary: 215 16% 47%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 13% 91%;
  --secondary-foreground: 222 20% 15%;
  --muted: 220 13% 91%;
  --muted-foreground: 220 9% 46%;
  --accent: 199 18% 56%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 98%;
  --border: 220 13% 85%;
  --input: 220 13% 85%;
  --ring: 215 16% 47%;
  --radius: 0.9rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("215 16% 47%")}
}

.dark {
  --background: 222 22% 8%;
  --foreground: 210 20% 96%;
  --card: 222 18% 13%;
  --card-foreground: 210 20% 96%;
  --popover: 222 18% 12%;
  --popover-foreground: 210 20% 96%;
  --primary: 213 20% 70%;
  --primary-foreground: 222 22% 8%;
  --secondary: 220 15% 18%;
  --secondary-foreground: 210 20% 96%;
  --muted: 220 15% 18%;
  --muted-foreground: 216 12% 65%;
  --accent: 199 22% 62%;
  --accent-foreground: 222 22% 8%;
  --destructive: 0 63% 45%;
  --destructive-foreground: 0 0% 98%;
  --border: 220 15% 22%;
  --input: 220 15% 22%;
  --ring: 213 20% 70%;${CHART_VARS_DARK}${SIDEBAR_VARS("213 20% 70%")}
}

/* Brushed-steel gradient sheen on card/button surfaces. */
[data-slot="card"] {
  background-image: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(220 15% 90% / 0.4) 50%, hsl(var(--card)) 100%);
}
.dark [data-slot="card"] {
  background-image: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(220 15% 22% / 0.5) 50%, hsl(var(--card)) 100%);
}
`;

/* ---------------- NEON TOKYO ---------------- */
const NEON_TOKYO_CSS = `
:root {
  --background: 0 0% 100%;
  --foreground: 300 30% 8%;
  --card: 0 0% 100%;
  --card-foreground: 300 30% 8%;
  --popover: 0 0% 100%;
  --popover-foreground: 300 30% 8%;
  --primary: 330 85% 55%;
  --primary-foreground: 0 0% 100%;
  --secondary: 280 20% 95%;
  --secondary-foreground: 300 30% 10%;
  --muted: 280 20% 95%;
  --muted-foreground: 280 10% 45%;
  --accent: 189 94% 50%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 280 15% 88%;
  --input: 280 15% 88%;
  --ring: 330 85% 55%;
  --radius: 0.75rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("330 85% 55%")}
}

.dark {
  --background: 280 40% 4%;
  --foreground: 300 20% 96%;
  --card: 280 35% 8%;
  --card-foreground: 300 20% 96%;
  --popover: 280 35% 7%;
  --popover-foreground: 300 20% 96%;
  --primary: 330 90% 62%;
  --primary-foreground: 280 40% 4%;
  --secondary: 280 25% 14%;
  --secondary-foreground: 300 20% 96%;
  --muted: 280 25% 14%;
  --muted-foreground: 285 12% 65%;
  --accent: 189 94% 58%;
  --accent-foreground: 280 40% 4%;
  --destructive: 0 74% 55%;
  --destructive-foreground: 0 0% 98%;
  --border: 280 25% 18%;
  --input: 280 25% 18%;
  --ring: 330 90% 62%;${CHART_VARS_DARK}${SIDEBAR_VARS("330 90% 62%")}
}

/* Neon glow accents in dark mode on primary surfaces only — kept subtle
 * and never applied to body text, per the anti-slop contrast rules. */
.dark [data-slot="button"][class*="bg-primary"] {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.35);
}
`;

/* ---------------- TERRA (earthy) ---------------- */
const TERRA_EARTH_CSS = `
:root {
  --background: 42 30% 97%;
  --foreground: 100 15% 12%;
  --card: 42 25% 99%;
  --card-foreground: 100 15% 12%;
  --popover: 42 25% 99%;
  --popover-foreground: 100 15% 12%;
  --primary: 100 20% 45%;
  --primary-foreground: 0 0% 100%;
  --secondary: 42 20% 92%;
  --secondary-foreground: 100 15% 14%;
  --muted: 42 20% 92%;
  --muted-foreground: 90 8% 42%;
  --accent: 25 45% 55%;
  --accent-foreground: 0 0% 100%;
  --destructive: 8 70% 48%;
  --destructive-foreground: 0 0% 98%;
  --border: 42 18% 86%;
  --input: 42 18% 86%;
  --ring: 100 20% 45%;
  --radius: 0.9rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("100 20% 45%")}
}

.dark {
  --background: 100 18% 8%;
  --foreground: 42 20% 94%;
  --card: 100 15% 12%;
  --card-foreground: 42 20% 94%;
  --popover: 100 15% 11%;
  --popover-foreground: 42 20% 94%;
  --primary: 100 25% 58%;
  --primary-foreground: 100 18% 8%;
  --secondary: 100 12% 17%;
  --secondary-foreground: 42 20% 94%;
  --muted: 100 12% 17%;
  --muted-foreground: 90 8% 62%;
  --accent: 25 45% 60%;
  --accent-foreground: 100 18% 8%;
  --destructive: 8 60% 48%;
  --destructive-foreground: 0 0% 98%;
  --border: 100 12% 20%;
  --input: 100 12% 20%;
  --ring: 100 25% 58%;${CHART_VARS_DARK}${SIDEBAR_VARS("100 25% 58%")}
}
`;

/* ---------------- MINIMAL MONO (zero color accent) ---------------- */
const MINIMAL_MONO_CSS = `
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --accent: 0 0% 9%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 0% 20%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --ring: 0 0% 9%;
  --radius: 0.375rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("0 0% 9%")}
}

.dark {
  --background: 0 0% 7%;
  --foreground: 0 0% 96%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 96%;
  --popover: 0 0% 9%;
  --popover-foreground: 0 0% 96%;
  --primary: 0 0% 96%;
  --primary-foreground: 0 0% 7%;
  --secondary: 0 0% 15%;
  --secondary-foreground: 0 0% 96%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 63%;
  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 7%;
  --destructive: 0 0% 80%;
  --destructive-foreground: 0 0% 7%;
  --border: 0 0% 18%;
  --input: 0 0% 18%;
  --ring: 0 0% 96%;${CHART_VARS_DARK}${SIDEBAR_VARS("0 0% 96%")}
}
`;

/* ---------------- SHADCN/UI DEFAULT (stock zinc, unmodified) ---------------- */
const SHADCN_DEFAULT_CSS = `
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;${CHART_VARS_LIGHT}${SIDEBAR_VARS("240 5.9% 10%")}
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;${CHART_VARS_DARK}${SIDEBAR_VARS("240 4.9% 83.9%")}
}
`;

const THEME_CSS_BY_ID: Record<SandboxStyleId, string> = {
  "modern-saas": MODERN_SAAS_CSS,
  "editorial-dark": EDITORIAL_DARK_CSS,
  "warm-neutral": WARM_NEUTRAL_CSS,
  "vibrant-accent": VIBRANT_ACCENT_CSS,
  glassmorphism: GLASSMORPHISM_CSS,
  brutalist: BRUTALIST_CSS,
  "oled-dark": OLED_DARK_CSS,
  "liquid-metal": LIQUID_METAL_CSS,
  "neon-tokyo": NEON_TOKYO_CSS,
  "terra-earth": TERRA_EARTH_CSS,
  "minimal-mono": MINIMAL_MONO_CSS,
  "shadcn-default": SHADCN_DEFAULT_CSS,
};

/** Full globals CSS (tokens + shared structural base) for a style preset. */
export function getThemeCSS(styleId: string = DEFAULT_STYLE_ID): string {
  const id: SandboxStyleId = isSandboxStyleId(styleId) ? styleId : DEFAULT_STYLE_ID;
  return `${THEME_CSS_BY_ID[id]}\n${SHARED_BASE_CSS}`;
}

/** Backward-compatible default export used by existing sandpack-config imports. */
export const SANDBOX_GLOBALS_CSS = getThemeCSS(DEFAULT_STYLE_ID);

/* ============================================================
 * PHASE 1 AUDIT: preset surface-tone accessor.
 * The post-generation visual validator (lib/generated-code-validation.ts)
 * cross-references generated color classes against the ACTIVE preset's real
 * token values (parsed here) rather than guessing. Additive; existing exports
 * are unchanged.
 * ============================================================ */

export type PresetSurfaceTones = {
  /** ":root" (light) surface + text lightness, 0-100. */
  light: { background: number; foreground: number };
  /** ".dark" surface + text lightness, 0-100. */
  dark: { background: number; foreground: number };
};

/** Extract the lightness (third HSL component, the value before `%`) of a CSS
 * custom property inside a given selector block of a preset's CSS string. */
function parseTokenLightness(css: string, selector: ":root" | ".dark", varName: string): number | null {
  const selectorIndex = css.indexOf(`${selector} {`);
  if (selectorIndex === -1) return null;
  const blockEnd = css.indexOf("}", selectorIndex);
  const block = css.slice(selectorIndex, blockEnd === -1 ? undefined : blockEnd);
  const re = new RegExp(`--${varName}:\\s*[\\d.]+\\s+[\\d.]+%\\s+([\\d.]+)%`);
  const match = block.match(re);
  return match ? Number(match[1]) : null;
}

/** Resolved background/foreground lightness for a preset, light and dark.
 * Falls back to the default preset for unknown ids, and to safe extremes if a
 * token can't be parsed. */
export function getPresetSurfaceTones(styleId: string = DEFAULT_STYLE_ID): PresetSurfaceTones {
  const id: SandboxStyleId = isSandboxStyleId(styleId) ? styleId : DEFAULT_STYLE_ID;
  const css = THEME_CSS_BY_ID[id];
  return {
    light: {
      background: parseTokenLightness(css, ":root", "background") ?? 100,
      foreground: parseTokenLightness(css, ":root", "foreground") ?? 4,
    },
    dark: {
      background: parseTokenLightness(css, ".dark", "background") ?? 5,
      foreground: parseTokenLightness(css, ".dark", "foreground") ?? 96,
    },
  };
}

export type SandboxTheme = "light" | "dark";

export function sandboxThemeClass(theme: SandboxTheme = "light") {
  return theme === "dark" ? "dark" : "";
}
