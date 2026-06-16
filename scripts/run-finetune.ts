/**
 * Submit a Together fine-tuning job from exported JSONL.
 *
 * Usage:
 *   pnpm export:training
 *   pnpm run:finetune
 *   pnpm run:finetune -- --file data/training-export.jsonl --model meta-llama/Llama-3.3-70B-Instruct-Reference
 *
 * After the job completes, set FINETUNED_MODEL_ID (and optionally NEXT_PUBLIC_FINETUNED_MODEL_ID)
 * to the returned checkpoint id.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv: string[]) {
  const fileIndex = argv.indexOf("--file");
  const modelIndex = argv.indexOf("--model");
  const suffixIndex = argv.indexOf("--suffix");

  return {
    file: fileIndex >= 0 ? argv[fileIndex + 1] : "data/training-export.jsonl",
    model:
      modelIndex >= 0
        ? argv[modelIndex + 1]
        : "meta-llama/Llama-3.3-70B-Instruct-Reference",
    suffix: suffixIndex >= 0 ? argv[suffixIndex + 1] : "chinna-coder-v1",
  };
}

async function main() {
  const { file, model, suffix } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.TOGETHER_API_KEY;

  if (!apiKey) {
    console.error("TOGETHER_API_KEY is required to submit a fine-tune job.");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), file);
  if (!existsSync(filePath)) {
    console.error(`Training file not found: ${filePath}`);
    console.error("Run `pnpm export:training` first.");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf8").trim();
  if (!raw) {
    console.error("Training file is empty.");
    process.exit(1);
  }

  const lines = raw.split("\n").filter(Boolean);
  const trainingRows = lines.map((line) => {
    const parsed = JSON.parse(line) as {
      messages?: Array<{ role: string; content: string }>;
    };
    return { messages: parsed.messages ?? [] };
  });

  const response = await fetch("https://api.together.xyz/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      purpose: "fine-tune",
      file: trainingRows,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Upload failed:", errorText);
    console.error(
      "\nIf Together upload JSON is unavailable, upload the JSONL manually in the Together dashboard and rerun with FINETUNE_FILE_ID set.",
    );
    process.exit(1);
  }

  const uploaded = (await response.json()) as { id?: string };
  if (!uploaded.id) {
    console.error("Upload response missing file id:", uploaded);
    process.exit(1);
  }

  const jobResponse = await fetch("https://api.together.xyz/v1/fine-tunes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      training_file: uploaded.id,
      model,
      suffix,
      n_epochs: 1,
      learning_rate: 1e-5,
    }),
  });

  if (!jobResponse.ok) {
    const errorText = await jobResponse.text();
    console.error("Fine-tune job failed:", errorText);
    process.exit(1);
  }

  const job = await jobResponse.json();
  console.log("Fine-tune job submitted:");
  console.log(JSON.stringify(job, null, 2));
  console.log(
    "\nWhen complete, add FINETUNED_MODEL_ID=<checkpoint> to your environment.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});