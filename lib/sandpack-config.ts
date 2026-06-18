import * as shadcnComponents from "@/lib/shadcn";
import { instrumentFileForInspector } from "@/lib/design-inspector";
import {
  DESIGN_INSPECTOR_RUNTIME_PATH,
  DESIGN_INSPECTOR_RUNTIME_SOURCE,
} from "@/lib/design-inspector-runtime";
import { SANDBOX_GLOBALS_CSS, type SandboxTheme } from "@/lib/sandbox-theme";

export type SandpackBuildOptions = {
  includeShadcn?: boolean;
  theme?: SandboxTheme;
  designInspector?: boolean;
};

const FILE_EXTENSIONS = "tsx|ts|jsx|js|css|json|mjs|cjs|mdx|md|prisma";

function cleanPath(path: string | undefined | null) {
  if (!path) return null;
  const cleaned = path
    .trim()
    .replace(/^[`'"<({\[]+/, "")
    .replace(/[`'">)},;:\]]+$/g, "")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/^src\//, "");

  if (!cleaned || cleaned.includes("..")) return null;
  if (!new RegExp(`\\.(?:${FILE_EXTENSIONS})$`, "i").test(cleaned)) return null;
  return cleaned;
}

function inferPathFromContent(path: string, content: string) {
  const firstLine = (content ?? "").split("\n", 1)[0]?.trim() || "";
  const commentPathMatch = firstLine.match(
    /^(?:\/\/|\/\*|#)\s*([A-Za-z0-9_@./()[\]-]+\.(?:tsx|ts|jsx|js|css|json|mjs|cjs|mdx|prisma))/, 
  );

  if (commentPathMatch) {
    return cleanPath(commentPathMatch[1].replace(/\*\/$/, "")) || path;
  }

  return path;
}

function normalizePreviewPath(path: string) {
  return cleanPath(path) || path.replace(/^\/+/, "").replace(/^src\//, "");
}

function isGeneratedConfigFile(path: string, content: string) {
  const normalizedPath = normalizePreviewPath(inferPathFromContent(path, content)).toLowerCase();
  const filename = normalizedPath.split("/").pop() || normalizedPath;

  if (
    /^(tailwind|postcss|next|vite|tsconfig|package)(\.config)?\.(js|cjs|mjs|ts|tsx|json)$/.test(
      filename,
    )
  ) {
    return true;
  }

  return (
    content.includes("export default config") &&
    (content.includes("plugins:") ||
      content.includes("content:") ||
      content.includes("darkMode:")) &&
    !content.includes("return (")
  );
}

function isPreviewRuntimeFile(path: string, content: string) {
  const normalizedPath = normalizePreviewPath(inferPathFromContent(path, content)).toLowerCase();
  const filename = normalizedPath.split("/").pop() || normalizedPath;

  if (isGeneratedConfigFile(path, content)) return false;
  if (normalizedPath.includes("/api/") || normalizedPath.startsWith("api/")) return false;
  if (normalizedPath.startsWith("prisma/") || normalizedPath.endsWith(".prisma")) return false;
  if (normalizedPath.endsWith(".md") || normalizedPath.endsWith(".mdx")) return false;

  if (
    filename === "package.json" ||
    filename === "layout.tsx" ||
    filename === "layout.ts" ||
    filename === "middleware.ts" ||
    filename === "route.ts" ||
    filename === "route.tsx"
  ) {
    return false;
  }

  return /\.(tsx|ts|jsx|js|css)$/.test(normalizedPath);
}

function sanitizePreviewContent(content: string) {
  return content
    .replace(/^.*tailwindcss-animate.*$/gm, "")
    .replace(/plugins\s*:\s*\[[^\]]*tailwindcss-animate[^\]]*\]\s*,?/g, "")
    .replace(/plugins\s*:\s*\[\s*animate\s*\]\s*,?/g, "")
    .replace(/require\(["']tailwindcss-animate["']\)/g, "undefined")
    .replace(/^import\s+[^;]*from\s+["']next\/font\/google["'];?\n?/gm, "")
    .replace(/from\s+["']next\/navigation["']/g, 'from "@/lib/next-navigation"')
    .replace(/from\s+["']next\/link["']/g, 'from "@/lib/next-link"')
    .replace(/from\s+["']next\/image["']/g, 'from "@/lib/next-image"');
}

function isLikelyRenderableReactFile(path: string, content: string) {
  const normalizedPath = normalizePreviewPath(inferPathFromContent(path, content)).toLowerCase();

  if (!/\.(tsx|jsx)$/.test(normalizedPath)) return false;
  if (isGeneratedConfigFile(path, content)) return false;

  return (
    /export\s+default\s+function\s+[A-ZA-Za-z0-9_]*/.test(content) ||
    /export\s+default\s+[A-ZA-Za-z0-9_]+/.test(content) ||
    /return\s*\(/.test(content) ||
    /<[A-Za-z][A-Za-z0-9]*(\s|>|\/>)/.test(content)
  );
}

function toImportPath(path: string) {
  return `./${normalizePreviewPath(path).replace(/\.(tsx|jsx|ts|js|css)$/, "")}`;
}

export function getSandpackConfig(
  inputFiles: Array<{ path: string; content?: string; code?: string }>,
  extraDependencies: Record<string, string> = {},
  options: SandpackBuildOptions = {},
) {
  const includeShadcn = options.includeShadcn !== false;
  const theme = options.theme ?? "light";
  const designInspector = options.designInspector === true;

  const files: Array<{ path: string; content: string }> = (inputFiles || [])
    .filter((f) => f && typeof f.path === "string")
    .map((f) => ({
      path: f.path,
      content:
        typeof f.content === "string"
          ? f.content
          : typeof f.code === "string"
            ? f.code
            : "",
    }));

  const sandpackFiles: Record<string, string> = includeShadcn
    ? { ...shadcnFiles }
    : {
        "/lib/utils.ts": shadcnComponents.utils,
      };
  const previewUserFiles: Array<{ path: string; content: string }> = [];

  if (!sandpackFiles["/app/globals.css"]) {
    sandpackFiles["/app/globals.css"] = SANDBOX_GLOBALS_CSS;
  }
  sandpackFiles["/lib/twind.ts"] = twindSetupFile;

  sandpackFiles["/tsconfig.json"] = `{
    "include": [
      "./**/*"
    ],
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "allowSyntheticDefaultImports": true,
      "moduleResolution": "bundler",
      "lib": [ "dom", "dom.iterable", "es2015", "es2020" ],
      "jsx": "react-jsx",
      "baseUrl": "./",
      "paths": {
        "@/app/*": ["app/*"],
        "@/components/*": ["components/*"],
        "@/hooks/*": ["hooks/*"],
        "@/lib/*": ["lib/*"],
        "@/utils/*": ["utils/*"],
        "@/types/*": ["types/*"]
      }
    }
  }`;

  for (const file of files) {
    if (!isPreviewRuntimeFile(file.path, file.content)) continue;

    const normalizedPath = normalizePreviewPath(inferPathFromContent(file.path, file.content));
    const sanitizedContent = sanitizePreviewContent(file.content);
    const previewContent = designInspector
      ? instrumentFileForInspector({ path: normalizedPath, code: sanitizedContent })
      : sanitizedContent;

    sandpackFiles[normalizedPath] = previewContent;
    previewUserFiles.push({ path: normalizedPath, content: previewContent });
  }

  if (designInspector) {
    sandpackFiles[DESIGN_INSPECTOR_RUNTIME_PATH] = DESIGN_INSPECTOR_RUNTIME_SOURCE;
  }

  if (!sandpackFiles["App.tsx"] && previewUserFiles.length > 0) {
    const mainFile =
      previewUserFiles.find((f) => f.path === "app/page.tsx") ||
      previewUserFiles.find((f) => f.path === "pages/index.tsx") ||
      previewUserFiles.find((f) => f.path.endsWith("/App.tsx")) ||
      previewUserFiles.find((f) => f.path === "App.tsx") ||
      previewUserFiles.find((f) => isLikelyRenderableReactFile(f.path, f.content));

    if (mainFile) {
      const cssImports = previewUserFiles
        .filter((f) => f.path.endsWith(".css") && f.path !== "app/globals.css")
        .map((f) => `import './${f.path}';`)
        .join("\n");

      const themeClass = theme === "dark" ? "dark" : "";
      const inspectorImport = designInspector
        ? `import { InspectorProvider } from '@/lib/design-inspector-runtime';\n`
        : "";
      const inspectorWrap = designInspector
        ? (child: string) => `<InspectorProvider>${child}</InspectorProvider>`
        : (child: string) => child;

      sandpackFiles["App.tsx"] = `import React from 'react';
import './app/globals.css';
${cssImports}
import { ensureTwind } from '@/lib/twind';
${inspectorImport}import MainComponent from '${toImportPath(mainFile.path)}';

ensureTwind();

export default function App() {
  return (
    <div className="${themeClass} min-h-dvh bg-background text-foreground">
      ${inspectorWrap("<MainComponent />")}
    </div>
  );
}`;
    }
  }

  for (const [path, content] of Object.entries(sandpackFiles)) {
    if (!path || path === "null" || path === "undefined") {
      throw new Error(`Invalid Sandpack file path: ${String(path)}`);
    }

    if (typeof content !== "string") {
      sandpackFiles[path] = "";
    }
  }

  return {
    template: "react-ts" as const,
    files: sandpackFiles,
    options: {},
    customSetup: {
      dependencies: { ...dependencies, ...extraDependencies },
    },
  };
}

const scrollAreaComponent = `import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root {...props}>
    <ScrollAreaPrimitive.Viewport ref={ref} className={cn("h-full w-full rounded-[inherit]", className)}>
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
`;

const aspectRatioComponent = `import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"
const AspectRatio = AspectRatioPrimitive.Root
export { AspectRatio }
`;

const sonnerComponent = `export { Toaster, toast } from "sonner"
`;

const twindSetupFile = `import { install } from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";

let installed = false;

export function ensureTwind() {
  if (installed || typeof window === "undefined") return;

  install({
    hash: false,
    darkMode: "class",
    presets: [
      presetAutoprefix(),
      presetTailwind({ disablePreflight: true }),
    ],
    theme: {
      extend: {
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        colors: {
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          chart: {
            "1": "hsl(var(--chart-1))",
            "2": "hsl(var(--chart-2))",
            "3": "hsl(var(--chart-3))",
            "4": "hsl(var(--chart-4))",
            "5": "hsl(var(--chart-5))",
          },
          sidebar: {
            DEFAULT: "hsl(var(--sidebar-background))",
            foreground: "hsl(var(--sidebar-foreground))",
            primary: "hsl(var(--sidebar-primary))",
            "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
            accent: "hsl(var(--sidebar-accent))",
            "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
            border: "hsl(var(--sidebar-border))",
            ring: "hsl(var(--sidebar-ring))",
          },
        },
        fontFamily: {
          sans: [
            "Aeonik",
            "ui-sans-serif",
            "system-ui",
            "-apple-system",
            "BlinkMacSystemFont",
            '"Segoe UI"',
            "sans-serif",
          ],
          mono: [
            "Aeonik Mono",
            "ui-monospace",
            "SFMono-Regular",
            "Menlo",
            "Monaco",
            "Consolas",
            '"Liberation Mono"',
            '"Courier New"',
            "monospace",
          ],
        },
      },
    },
  });

  installed = true;
}
`;

const shadcnFiles = {
  "/lib/utils.ts": shadcnComponents.utils,
  "/lib/next-navigation.ts": `
  export function useRouter() {
    return {
      push: (url: string) => {
        if (typeof window !== "undefined") window.history.pushState({}, "", url)
      },
      replace: (url: string) => {
        if (typeof window !== "undefined") window.history.replaceState({}, "", url)
      },
      back: () => {
        if (typeof window !== "undefined") window.history.back()
      },
      refresh: () => {}
    }
  }

  export function usePathname() {
    return typeof window === "undefined" ? "/" : window.location.pathname
  }

  export function useSearchParams() {
    return new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search
    )
  }
  `,
  "/lib/next-link.tsx": `
  import * as React from "react"

  export default function Link({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <a href={href} {...props}>{children}</a>
  }
  `,
  "/lib/next-image.tsx": `
  import * as React from "react"

  export default function Image(
    props: React.ImgHTMLAttributes<HTMLImageElement>
  ) {
    return <img {...props} />
  }
  `,
  "/components/ui/accordion.tsx": shadcnComponents.accordian,
  "/components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "/components/ui/alert.tsx": shadcnComponents.alert,
  "/components/ui/aspect-ratio.tsx": aspectRatioComponent,
  "/components/ui/avatar.tsx": shadcnComponents.avatar,
  "/components/ui/badge.tsx": shadcnComponents.badge,
  "/components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "/components/ui/button.tsx": shadcnComponents.button,
  "/components/ui/calendar.tsx": shadcnComponents.calendar,
  "/components/ui/card.tsx": shadcnComponents.card,
  "/components/ui/carousel.tsx": shadcnComponents.carousel,
  "/components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "/components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "/components/ui/dialog.tsx": shadcnComponents.dialog,
  "/components/ui/drawer.tsx": shadcnComponents.drawer,
  "/components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "/components/ui/input.tsx": shadcnComponents.input,
  "/components/ui/label.tsx": shadcnComponents.label,
  "/components/ui/menubar.tsx": shadcnComponents.menuBar,
  "/components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "/components/ui/pagination.tsx": shadcnComponents.pagination,
  "/components/ui/popover.tsx": shadcnComponents.popover,
  "/components/ui/progress.tsx": shadcnComponents.progress,
  "/components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "/components/ui/scroll-area.tsx": scrollAreaComponent,
  "/components/ui/select.tsx": shadcnComponents.select,
  "/components/ui/separator.tsx": shadcnComponents.separator,
  "/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "/components/ui/slider.tsx": shadcnComponents.slider,
  "/components/ui/sonner.tsx": sonnerComponent,
  "/components/ui/switch.tsx": shadcnComponents.switchComponent,
  "/components/ui/table.tsx": shadcnComponents.table,
  "/components/ui/tabs.tsx": shadcnComponents.tabs,
  "/components/ui/textarea.tsx": shadcnComponents.textarea,
  "/components/ui/toast.tsx": shadcnComponents.toast,
  "/components/ui/toaster.tsx": shadcnComponents.toaster,
  "/components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "/components/ui/toggle.tsx": shadcnComponents.toggle,
  "/components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "/components/ui/use-toast.tsx": shadcnComponents.useToast,
  "/hooks/use-toast.ts": shadcnComponents.useToast,
  "/components/ui/index.tsx": `
  export * from "./button"
  export * from "./card"
  export * from "./input"
  export * from "./label"
  export * from "./select"
  export * from "./textarea"
  export * from "./avatar"
  export * from "./radio-group"
  export * from "./scroll-area"
  export * from "./separator"
  export * from "./tabs"
  `,
  "/public/index.html": `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
  `,
};

const dependencies = {
  "@twind/core": "latest",
  "@twind/preset-autoprefix": "latest",
  "@twind/preset-tailwind": "latest",
  animejs: "latest",
  gsap: "^3.15.0",
  "lucide-react": "latest",
  recharts: "2.9.0",
  "react-router-dom": "latest",
  "@radix-ui/react-accordion": "1.2.14",
  "@radix-ui/react-alert-dialog": "1.1.16",
  "@radix-ui/react-aspect-ratio": "1.1.8",
  "@radix-ui/react-avatar": "1.1.12",
  "@radix-ui/react-checkbox": "1.3.4",
  "@radix-ui/react-collapsible": "1.1.13",
  "@radix-ui/react-dialog": "1.1.16",
  "@radix-ui/react-dropdown-menu": "2.1.17",
  "@radix-ui/react-hover-card": "1.1.17",
  "@radix-ui/react-label": "2.1.9",
  "@radix-ui/react-menubar": "1.1.17",
  "@radix-ui/react-navigation-menu": "1.2.16",
  "@radix-ui/react-popover": "1.1.16",
  "@radix-ui/react-progress": "1.1.9",
  "@radix-ui/react-radio-group": "1.3.8",
  "@radix-ui/react-scroll-area": "1.2.11",
  "@radix-ui/react-select": "2.2.6",
  "@radix-ui/react-separator": "1.1.9",
  "@radix-ui/react-slider": "1.3.6",
  "@radix-ui/react-slot": "1.2.5",
  "@radix-ui/react-switch": "1.2.6",
  "@radix-ui/react-tabs": "1.1.14",
  "@radix-ui/react-toast": "1.2.16",
  "@radix-ui/react-toggle": "1.1.11",
  "@radix-ui/react-toggle-group": "1.1.12",
  "@radix-ui/react-tooltip": "1.2.9",
  "@radix-ui/react-visually-hidden": "1.2.4",
  "@hookform/resolvers": "latest",
  "class-variance-authority": "^0.7.0",
  clsx: "^2.1.1",
  cmdk: "latest",
  "date-fns": "^3.6.0",
  "embla-carousel-react": "^8.1.8",
  "framer-motion": "^11.15.0",
  "next-themes": "latest",
  "react-day-picker": "^8.10.1",
  "react-hook-form": "latest",
  "react-resizable-panels": "latest",
  sonner: "latest",
  "tailwind-merge": "^2.4.0",
  three: "^0.167.1",
  vaul: "^0.9.1",
  zod: "^3.24.1",
  zustand: "latest",
};
