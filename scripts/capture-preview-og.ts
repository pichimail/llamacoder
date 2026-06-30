/**
 * Capture share-page screenshots with Playwright and store them on assistant messages
 * for richer dynamic OG images.
 *
 * Usage:
 *   pnpm capture:og -- --baseUrl=http://localhost:3000 --messageId=abc123
 *   pnpm capture:og -- --baseUrl=https://your-app.vercel.app --limit=10
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

type Args = {
  baseUrl: string;
  messageId?: string;
  limit: number;
  outDir: string;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    baseUrl: get("--baseUrl") || process.env.CAPTURE_BASE_URL || "http://localhost:3000",
    messageId: get("--messageId"),
    limit: Number(get("--limit") || "5"),
    outDir: get("--outDir") || path.join(process.cwd(), ".preview-captures"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { chromium } = await import("playwright-core");
  await mkdir(args.outDir, { recursive: true });

  let targets: string[] = [];
  if (args.messageId) {
    targets = [args.messageId];
  } else {
    const res = await fetch(`${args.baseUrl.replace(/\/$/, "")}/api/admin/stats`, {
      cache: "no-store",
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      const chats = (data.recentChats || []) as { id: string }[];
      targets = chats.slice(0, args.limit).map((c) => c.id);
    }
  }

  if (targets.length === 0) {
    console.error("No capture targets. Pass --messageId or ensure admin stats are reachable.");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

  for (const id of targets) {
    const sharePath = args.messageId ? `/share/v2/${id}` : `/chats/${id}`;
    const url = `${args.baseUrl.replace(/\/$/, "")}${sharePath}`;
    console.log(`Capturing ${url}`);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(2500);
      const filePath = path.join(args.outDir, `${id}.png`);
      await page.screenshot({ path: filePath, type: "png" });
      console.log(`Saved ${filePath}`);

      if (args.messageId) {
        const uploadRes = await fetch(`${args.baseUrl.replace(/\/$/, "")}/api/blob-upload`, {
          method: "POST",
          body: await buildFormDataFromFile(filePath),
        }).catch(() => null);
        if (uploadRes?.ok) {
          const blob = (await uploadRes.json()) as { url?: string };
          if (blob.url) {
            await fetch(`${args.baseUrl.replace(/\/$/, "")}/api/messages/${id}/preview-image`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ previewImageUrl: blob.url }),
            });
            console.log(`Stored previewImageUrl for ${id}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed ${url}:`, error instanceof Error ? error.message : error);
    }
  }

  await browser.close();
}

async function buildFormDataFromFile(filePath: string) {
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    path.basename(filePath),
  );
  return form;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});