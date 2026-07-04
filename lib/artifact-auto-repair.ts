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

function componentBody(name: string) {
  const title = titleFromComponent(name);
  const lower = title.toLowerCase();

  if (lower.includes("energy") || lower.includes("path")) {
    return `export default function ${name}() {
  const paths = ["M0 80 C 180 10, 360 150, 540 70", "M40 140 C 220 40, 420 180, 620 100", "M120 40 C 280 120, 420 0, 700 90"];

  return (
    <section className="relative isolate overflow-hidden border-y border-cyan-400/10 bg-slate-950/80 px-6 py-24 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.5em] text-cyan-300/80">Infrastructure Flow</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Energy paths connect every future district.</h2>
        <svg className="mt-12 h-56 w-full overflow-visible" viewBox="0 0 720 220" fill="none" aria-hidden="true">
          {paths.map((path, index) => (
            <path key={path} d={path} stroke={index === 1 ? "#38bdf8" : "#1d4ed8"} strokeWidth={index === 1 ? 3 : 1.5} strokeLinecap="round" className="animate-pulse drop-shadow-[0_0_16px_rgba(56,189,248,0.75)]" />
          ))}
        </svg>
      </div>
    </section>
  );
}`;
  }

  if (lower.includes("value")) {
    return `export default function ${name}() {
  const values = [
    ["Vision", "Cities designed as adaptive digital ecosystems."],
    ["Trust", "Enterprise-grade planning with transparent development intelligence."],
    ["Momentum", "Future-ready infrastructure that compounds in value."],
  ];

  return (
    <section className="bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.5em] text-blue-300/80">Values</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Built for the next era of real estate.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {values.map(([label, body]) => (
            <article key={label} className="rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-7 shadow-[0_0_60px_rgba(14,165,233,0.08)]">
              <h3 className="text-2xl font-semibold text-cyan-100">{label}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  if (lower.includes("contact")) {
    return `export default function ${name}() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 text-white">
      <div className="absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[2rem] border border-cyan-300/15 bg-cyan-300/[0.04] p-8 shadow-[0_0_80px_rgba(56,189,248,0.14)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-cyan-300/80">Contact</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Enter the Nexus.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Start a private walkthrough of the future real-estate intelligence platform.</p>
        </div>
        <a href="mailto:hello@nexus.example" className="rounded-full border border-cyan-300/30 bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.45)] transition hover:bg-white">Request access</a>
      </div>
    </section>
  );
}`;
  }

  return `export default function ${name}() {
  return (
    <section className="bg-slate-950 px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/80">${title}</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight">${title}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">Generated support section for this artifact.</p>
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
