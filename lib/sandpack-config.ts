import * as shadcnComponents from "@/lib/shadcn";

function inferPathFromContent(path: string, content: string) {
  const firstLine = (content ?? "").split("\n", 1)[0]?.trim() || "";
  const commentPathMatch = firstLine.match(
    /^(?:\/\/|\/\*|#)\s*([A-Za-z0-9_@./()[\]-]+\.(?:tsx|ts|jsx|js|css|json|mjs|cjs|mdx|prisma))/,
  );

  if (commentPathMatch) {
    return commentPathMatch[1].replace(/\*\/$/, "");
  }

  return path;
}

function normalizePreviewPath(path: string) {
  let normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  if (normalizedPath.startsWith("src/")) {
    normalizedPath = normalizedPath.slice(4);
  }

  return normalizedPath;
}

function isGeneratedConfigFile(path: string, content: string) {
  const normalizedPath = normalizePreviewPath(
    inferPathFromContent(path, content),
  ).toLowerCase();
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
  const normalizedPath = normalizePreviewPath(
    inferPathFromContent(path, content),
  ).toLowerCase();
  const filename = normalizedPath.split("/").pop() || normalizedPath;

  if (isGeneratedConfigFile(path, content)) return false;
  if (normalizedPath.includes("/api/")) return false;
  if (normalizedPath.startsWith("api/")) return false;
  if (normalizedPath.startsWith("prisma/")) return false;
  if (normalizedPath.endsWith(".prisma")) return false;
  if (normalizedPath.endsWith(".md") || normalizedPath.endsWith(".mdx")) {
    return false;
  }

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
    .replace(/from\s+["']next\/navigation["']/g, 'from "@/lib/next-navigation"')
    .replace(/from\s+["']next\/link["']/g, 'from "@/lib/next-link"')
    .replace(/from\s+["']next\/image["']/g, 'from "@/lib/next-image"');
}

function isLikelyRenderableReactFile(path: string, content: string) {
  const normalizedPath = normalizePreviewPath(
    inferPathFromContent(path, content),
  ).toLowerCase();

  if (!/\.(tsx|jsx)$/.test(normalizedPath)) return false;
  if (isGeneratedConfigFile(path, content)) return false;

  return (
    /export\s+default\s+function\s+[A-ZA-Za-z0-9_]*/.test(content) ||
    /export\s+default\s+[A-ZA-Za-z0-9_]+/.test(content) ||
    /return\s*\(/.test(content) ||
    /<[A-Za-z][A-Za-z0-9]*(\s|>|\/>)/.test(content)
  );
}

export function getSandpackConfig(
  inputFiles: Array<{ path: string; content?: string; code?: string }>,
  extraDependencies: Record<string, string> = {},
) {
  // Defensive normalization: accept both { content } and legacy { code } shapes.
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

  const sandpackFiles: Record<string, string> = { ...shadcnFiles };
  const previewUserFiles: Array<{ path: string; content: string }> = [];

  // Add tsconfig
  sandpackFiles["/tsconfig.json"] = `{
    "include": [
      "./**/*"
    ],
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "lib": [ "dom", "es2015" ],
      "jsx": "react-jsx",
      "baseUrl": "./",
      "paths": {
        "@/components/*": ["components/*"],
        "@/lib/*": ["lib/*"],
        "@/utils/*": ["utils/*"],
        "@/types/*": ["types/*"]
      }
    }
  }`;

  // Add user files
  for (const file of files) {
    if (!isPreviewRuntimeFile(file.path, file.content)) continue;

    const normalizedPath = normalizePreviewPath(
      inferPathFromContent(file.path, file.content),
    );
    const sanitizedContent = sanitizePreviewContent(file.content);

    sandpackFiles[normalizedPath] = sanitizedContent;
    previewUserFiles.push({ path: normalizedPath, content: sanitizedContent });
  }

  // Ensure App.tsx is the entry point, or if not present, create one that imports the first file
  if (!sandpackFiles["App.tsx"] && previewUserFiles.length > 0) {
    const mainFile =
      previewUserFiles.find((f) => f.path === "app/page.tsx") ||
      previewUserFiles.find((f) => f.path === "pages/index.tsx") ||
      previewUserFiles.find((f) => f.path.endsWith("/App.tsx")) ||
      previewUserFiles.find((f) =>
        isLikelyRenderableReactFile(f.path, f.content),
      );

    if (mainFile) {
      // Normalize the path for import
      let importPath = normalizePreviewPath(mainFile.path);
      importPath = importPath.replace(/\.(tsx|jsx)$/, "");

      sandpackFiles["App.tsx"] = `import React from 'react';
import MainComponent from './${importPath}';

export default function App() {
  return <MainComponent />;
}`;
    }
  }

  return {
    template: "react-ts" as const,
    files: sandpackFiles,
    options: {
      externalResources: [
        "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
      ],
    },
    customSetup: {
      dependencies: { ...dependencies, ...extraDependencies },
    },
  };
}

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
  "/components/ui/select.tsx": shadcnComponents.select,
  "/components/ui/separator.tsx": shadcnComponents.separator,
  "/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "/components/ui/slider.tsx": shadcnComponents.slider,
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
  "/components/ui/index.tsx": `
  export * from "./button"
  export * from "./card"
  export * from "./input"
  export * from "./label"
  export * from "./select"
  export * from "./textarea"
  export * from "./avatar"
  export * from "./radio-group"
  `,
  "/public/index.html": `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>
  `,
};

const dependencies = {
  "lucide-react": "latest",
  recharts: "2.9.0",
  "react-router-dom": "latest",
  "@radix-ui/react-accordion": "^1.2.0",
  "@radix-ui/react-alert-dialog": "^1.1.1",
  "@radix-ui/react-aspect-ratio": "^1.1.0",
  "@radix-ui/react-avatar": "^1.1.0",
  "@radix-ui/react-checkbox": "^1.1.1",
  "@radix-ui/react-collapsible": "^1.1.0",
  "@radix-ui/react-dialog": "^1.1.1",
  "@radix-ui/react-dropdown-menu": "^2.1.1",
  "@radix-ui/react-hover-card": "^1.1.1",
  "@radix-ui/react-label": "^2.1.0",
  "@radix-ui/react-menubar": "^1.1.1",
  "@radix-ui/react-navigation-menu": "^1.2.0",
  "@radix-ui/react-popover": "^1.1.1",
  "@radix-ui/react-progress": "^1.1.0",
  "@radix-ui/react-radio-group": "^1.2.0",
  "@radix-ui/react-select": "^2.1.1",
  "@radix-ui/react-separator": "^1.1.0",
  "@radix-ui/react-slider": "^1.2.0",
  "@radix-ui/react-slot": "^1.1.0",
  "@radix-ui/react-switch": "^1.1.0",
  "@radix-ui/react-tabs": "^1.1.0",
  "@radix-ui/react-toast": "^1.2.1",
  "@radix-ui/react-toggle": "^1.1.0",
  "@radix-ui/react-toggle-group": "^1.1.0",
  "@radix-ui/react-tooltip": "^1.1.2",
  "class-variance-authority": "^0.7.0",
  clsx: "^2.1.1",
  "date-fns": "^3.6.0",
  "embla-carousel-react": "^8.1.8",
  "react-day-picker": "^8.10.1",
  "tailwind-merge": "^2.4.0",
  "framer-motion": "^11.15.0",
  vaul: "^0.9.1",
};
