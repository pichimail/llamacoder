import "server-only";

/**
 * Thin server-side client for kie.ai's unified generation API — used by the
 * Studio page for image (Grok Imagine), video (Kling / Bytedance Seedance),
 * and music (Suno) generation. Docs: https://docs.kie.ai
 *
 * Image/video models share one job pattern: POST /api/v1/jobs/createTask,
 * then poll GET /api/v1/jobs/recordInfo?taskId=. Suno music has its own pair:
 * POST /api/v1/generate and GET /api/v1/generate/record-info?taskId=.
 */

const KIE_BASE_URL = "https://api.kie.ai";

export type StudioKind = "image" | "video" | "music";
export type ImageProvider = "grok-imagine";
export type VideoProvider = "kling" | "seedance";
export type MusicProvider = "suno";

export function isKieAiConfigured(): boolean {
  return Boolean(process.env.KIE_AI_API_KEY);
}

function requireApiKey(): string {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) throw new Error("KIE_AI_API_KEY is not configured.");
  return key;
}

async function kieFetch(path: string, init: RequestInit) {
  const response = await fetch(`${KIE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || (data && typeof data.code === "number" && data.code !== 200)) {
    const message = data?.msg || data?.message || `kie.ai request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export type ImageGenerationInput = {
  prompt: string;
  aspectRatio?: "1:1" | "2:3" | "3:2" | "16:9" | "9:16";
  quality?: "speed" | "pro";
};

export async function createImageJob(input: ImageGenerationInput) {
  const data = await kieFetch("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model: "grok-imagine/text-to-image",
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio ?? "1:1",
        nsfw_checker: true,
        enable_pro: input.quality === "pro",
      },
    }),
  });
  return { taskId: data.data.taskId as string };
}

export type VideoGenerationInput = {
  provider: VideoProvider;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
  duration?: "5" | "10";
  sound?: boolean;
};

export async function createVideoJob(input: VideoGenerationInput) {
  const model = input.provider === "kling" ? "kling-2.6/text-to-video" : "bytedance/v1-pro-text-to-video";
  const jobInput =
    input.provider === "kling"
      ? {
          prompt: input.prompt,
          sound: input.sound ?? false,
          aspect_ratio: (input.aspectRatio as "1:1" | "16:9" | "9:16") ?? "16:9",
          duration: input.duration ?? "5",
        }
      : {
          prompt: input.prompt,
          aspect_ratio: input.aspectRatio ?? "16:9",
          duration: input.duration ?? "5",
          resolution: "720p",
          nsfw_checker: true,
        };
  const data = await kieFetch("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({ model, input: jobInput }),
  });
  return { taskId: data.data.taskId as string };
}

export type MusicGenerationInput = {
  prompt: string;
  title?: string;
  style?: string;
  instrumental?: boolean;
};

export async function createMusicJob(input: MusicGenerationInput) {
  const data = await kieFetch("/api/v1/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt: input.prompt,
      customMode: false,
      instrumental: input.instrumental ?? false,
      model: "V4_5",
      style: input.style,
      title: input.title?.slice(0, 80),
    }),
  });
  return { taskId: data.data.taskId as string };
}

export type JobStatus = {
  status: "pending" | "generating" | "success" | "failed";
  resultUrls: string[];
  title?: string;
  errorMessage?: string;
};

const TERMINAL_SUCCESS = new Set(["success"]);
const TERMINAL_FAIL = new Set(["fail", "create_task_failed", "generate_audio_failed", "callback_exception", "sensitive_word_error"]);

export async function getImageOrVideoJobStatus(taskId: string): Promise<JobStatus> {
  const data = await kieFetch(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { method: "GET" });
  const state = String(data.data?.state ?? "").toLowerCase();
  if (TERMINAL_FAIL.has(state)) {
    return { status: "failed", resultUrls: [], errorMessage: data.data?.failMsg || "Generation failed." };
  }
  if (TERMINAL_SUCCESS.has(state)) {
    const parsed = safeParseJson(data.data?.resultJson);
    return { status: "success", resultUrls: Array.isArray(parsed?.resultUrls) ? parsed.resultUrls : [] };
  }
  return { status: "generating", resultUrls: [] };
}

export async function getMusicJobStatus(taskId: string): Promise<JobStatus> {
  const data = await kieFetch(`/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`, { method: "GET" });
  const status = String(data.data?.status ?? "").toLowerCase();
  if (TERMINAL_FAIL.has(status)) {
    return { status: "failed", resultUrls: [], errorMessage: data.data?.errorMessage || "Music generation failed." };
  }
  if (status === "success") {
    const tracks = data.data?.response?.sunoData ?? [];
    return {
      status: "success",
      resultUrls: tracks.map((track: { audioUrl?: string }) => track.audioUrl).filter(Boolean),
      title: tracks[0]?.title,
    };
  }
  return { status: "generating", resultUrls: [] };
}

function safeParseJson(value: unknown): { resultUrls?: string[] } | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
