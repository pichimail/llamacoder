type RepairableFile = {
  path: string;
  code?: string;
  content?: string;
  language?: string;
};

const IMPORT_RE = /\bimport\s+([^;]+?)\s+from\s+["'](@\/components\/[^"']+)["']/g;

function fileContent(file: RepairableFile) {
  return typeof file.code === "string" ? file.code : file.content || "";
}

function withoutExtension(path: string) {
  return path.replace(/\.(tsx|ts|jsx|js)$/i, "");
}

function possiblePaths(base: string) {
  const normalized = withoutExtension(base.replace(/^\/+/, "").replace(/^src\//, ""));
  return [
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}.jsx`,
    `${normalized}.js`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.jsx`,
    `${normalized}/index.js`,
  ];
}

function componentNameFromPath(path: string) {
  const leaf = withoutExtension(path).split("/").filter(Boolean).at(-1) || "GeneratedComponent";
  const cleaned = leaf
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, char: string) => char.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "");
  const name = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /^[A-Z][A-Za-z0-9]*$/.test(name) ? name : "GeneratedComponent";
}

function titleFromComponent(name: string) {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/**
 * Token-only fallback body for a missing local component.
 *
 * IMPORTANT: this is a repair stub, not a design. It intentionally uses ONLY
 * shadcn/Tailwind semantic tokens (bg-background, bg-card, text-foreground,
 * text-muted-foreground, border-border, bg-primary, text-primary-foreground)
 * so the injected theme preset — and its light/dark variants — drive every
 * color. It must never introduce neon/cyan/glow/glass slop, hardcoded hex,
 * black/white/gray-* literals, or invented marketing copy. Those were removed
 * in the Phase 1 audit; do not reintroduce them here.
 */
function componentBody(name: string) {
  const title = titleFromComponent(name);
  const lower = title.toLowerCase();

  // Contact / CTA-shaped section: neutral card + a single primary action.
  if (lower.includes("contact") || lower.includes("cta")) {
    return `export default function ${name}() {
  return (
    <section className="w-full border-y border-border bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-xl border border-border bg-card p-8 text-card-foreground md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">${title}</p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Get in touch</h2>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">This section was generated to keep the build compiling. Replace it with your real ${title.toLowerCase()} content.</p>
        </div>
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Continue
        </a>
      </div>
    </section>
  );
}`;
  }

  // Multi-item / values / features-shaped section: neutral card grid, no fake data.
  if (lower.includes("value") || lower.includes("feature") || lower.includes("grid") || lower.includes("list")) {
    return `export default function ${name}() {
  const items = [1, 2, 3];

  return (
    <section className="w-full bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">${title}</p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">${title}</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <article key={item} className="rounded-xl border border-border bg-card p-6 text-card-foreground">
              <h3 className="text-base font-medium">Item {item}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Placeholder content generated to keep the build compiling. Replace with real ${title.toLowerCase()} content.</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  // Generic default: a single neutral, token-only section.
  return `export default function ${name}() {
  return (
    <section className="w-full bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-8 text-card-foreground">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">${title}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">${title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Generated support section for this artifact. Replace with real content.</p>
      </div>
    </section>
  );
}`;
}

function parseNamedImports(importClause: string) {
  const match = importClause.match(/\{([^}]+)\}/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((part) => part.trim().split(/\s+as\s+/i)[0]?.trim())
    .filter(Boolean);
}

function makeComponentFile(path: string, importClause: string) {
  const name = componentNameFromPath(path);
  const namedImports = parseNamedImports(importClause).filter((item) => item !== name);
  const namedExports = namedImports.length
    ? `\n\n${namedImports.map((item) => `export const ${item} = ${name};`).join("\n")}`
    : "";

  return {
    path,
    code: `${componentBody(name)}${namedExports}\n`,
    language: "tsx",
  };
}

export function repairMissingLocalComponentFiles<T extends RepairableFile>(files: T[]): Array<T | RepairableFile> {
  const existing = new Set(files.map((file) => file.path.replace(/^\/+/, "").replace(/^src\//, "")));
  const repaired: Array<T | RepairableFile> = [...files];
  const queued = new Set<string>();

  for (const file of files) {
    const content = fileContent(file);
    let match: RegExpExecArray | null;
    while ((match = IMPORT_RE.exec(content))) {
      const importClause = match[1] || "";
      const spec = match[2] || "";
      const basePath = spec.replace(/^@\//, "");
      const candidates = possiblePaths(basePath);
      const exists = candidates.some((candidate) => existing.has(candidate) || queued.has(candidate));
      if (exists) continue;

      const path = `${withoutExtension(basePath)}.tsx`;
      queued.add(path);
      repaired.push(makeComponentFile(path, importClause));
    }
  }

  return repaired;
}
