"use client";

import type { Chat, Message } from "./page";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
} from "@/lib/utils";
import { Fragment } from "react";
import { AppVersionButton } from "@/components/app-version-button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message as AIMessage,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { BrailleLoader } from "@/components/ui/braille-loader";
import { isPlanResponse, PlanResponseCard } from "@/components/plan-mode-panel";
import {
  EnvironmentVariable,
  EnvironmentVariableCopyButton,
  EnvironmentVariableName,
  EnvironmentVariableRequired,
  EnvironmentVariables,
  EnvironmentVariablesContent,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
  EnvironmentVariableValue,
} from "@/components/ai-elements/environment-variables";

export default function ChatLog({
  chat,
  activeMessage,
  streamText,
  reasoningText = "",
  isReasoningStreaming = false,
  onMessageClick,
}: {
  chat: Chat;
  activeMessage?: Message;
  streamText: string;
  reasoningText?: string;
  isReasoningStreaming?: boolean;
  onMessageClick: (v: Message) => void;
}) {
  const assistantMessages = chat.messages.filter(
    (m) =>
      m.role === "assistant" &&
      (extractFirstCodeBlock(m.content) ||
        extractAllCodeBlocks(m.content).length > 0),
  );

  return (
    <Conversation
      className="relative h-full overflow-y-auto overscroll-contain bg-transparent"
      aria-label="Conversation history"
    >
      <ConversationContent
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
        aria-live="polite"
      >
        <AIMessage from="user">
          <MessageContent className="max-w-[75%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
            {chat.prompt}
          </MessageContent>
        </AIMessage>

        {chat.totalMessages > chat.messages.length && (
          <div className="py-1 text-center text-xs text-muted-foreground">
            Only last messages loaded. Full history not available.
          </div>
        )}

        {chat.messages.slice(2).map((message) => (
          <Fragment key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : (
              <AssistantMessage
                content={message.content}
                version={
                  (chat.assistantMessagesCountBefore || 0) +
                  assistantMessages.map((m) => m.id).indexOf(message.id) +
                  1
                }
                message={message}
                isActive={!streamText && activeMessage?.id === message.id}
                onMessageClick={onMessageClick}
                isStreaming={!!streamText}
              />
            )}
          </Fragment>
        ))}

        {isReasoningStreaming && !reasoningText && !streamText ? (
          <AIMessage from="assistant">
            <MessageContent className="flex items-center gap-3 text-muted-foreground">
              <BrailleLoader
                variant="helix"
                speed="normal"
                fontSize={24}
                label="Processing your request"
                className="text-fuchsia-300"
              />
              <span className="text-sm text-zinc-400">Processing your request</span>
            </MessageContent>
          </AIMessage>
        ) : null}

        {streamText ? (
          isPlanResponse(streamText) ? (
            <PlanResponseCard content={streamText} isStreaming />
          ) : (
            <AssistantMessage
              content={streamText}
              version={
                (chat.assistantMessagesCountBefore || 0) +
                assistantMessages.length +
                1
              }
              isActive={true}
              isStreaming
            />
          )
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

function compactUserContent(content: string) {
  const trimmed = content.trim();
  if (/Generated code validation failed before preview commit|Preview error:/i.test(trimmed)) {
    return "Fixing preview error";
  }
  if (/The code is not working|Apply the smallest working fix|Rebuild the generated app cleanly|Current artifact source:/i.test(trimmed)) {
    return "Applying requested fix";
  }
  if (/Apply the following change as a precise, minimal patch/i.test(trimmed)) {
    return trimmed
      .replace(/Apply the following change as a precise, minimal patch to the existing app \(only output files that actually need to change\):/i, "")
      .split("\n\nAttachments:")[0]
      .trim() || "Applying requested change";
  }
  if (/You are in \*\*PLAN mode\*\*/i.test(trimmed)) {
    return trimmed.split("Ready to build?").at(-1)?.trim() || "Planning the build";
  }
  if (/You are a helpful full-stack coding assistant/i.test(trimmed)) {
    return trimmed.split("For full apps or major changes, recommend the main agent flow for high-fidelity working output.").at(-1)?.trim() || "Asking a question";
  }
  return trimmed.length > 700 ? `${trimmed.slice(0, 700).trim()}...` : trimmed;
}

function UserMessage({ content }: { content: string }) {
  const compact = compactUserContent(content);
  const isInternal = compact !== content.trim();
  return (
    <AIMessage from="user">
      <MessageContent className="max-w-[75%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
        {isInternal ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary-foreground/70" aria-hidden="true" />
            {compact}
          </span>
        ) : (
          compact
        )}
      </MessageContent>
    </AIMessage>
  );
}

function extractEnvNames(content: string, files: Array<{ path?: string; code?: string; content?: string }> = []) {
  const haystack = [
    content,
    ...files.map((file) => `${file.path || ""}\n${file.code || file.content || ""}`),
  ].join("\n");
  const names = new Set<string>();
  const explicit = haystack.match(/\b[A-Z][A-Z0-9_]{2,}(?:API_KEY|TOKEN|SECRET|DATABASE_URL|WEBHOOK_URL|CLIENT_ID|CLIENT_SECRET|URL)\b/g) || [];
  explicit.forEach((name) => {
    if (!name.startsWith("NEXT_") || /KEY|TOKEN|SECRET|URL|ID/.test(name)) names.add(name);
  });
  if (/openai/i.test(haystack)) names.add("OPENAI_API_KEY");
  if (/gemini|google ai/i.test(haystack)) names.add("GEMINI_API_KEY");
  if (/database|prisma|postgres|neon/i.test(haystack)) names.add("DATABASE_URL");
  if (/webhook/i.test(haystack)) names.add("WEBHOOK_URL");
  return Array.from(names).slice(0, 8);
}

function EnvVarsCard({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <EnvironmentVariables className="overflow-hidden border-border/70 bg-card/70">
      <EnvironmentVariablesHeader className="px-3 py-2">
        <EnvironmentVariablesTitle className="text-xs">Environment variables</EnvironmentVariablesTitle>
        <EnvironmentVariablesToggle />
      </EnvironmentVariablesHeader>
      <EnvironmentVariablesContent>
        {names.map((name) => (
          <EnvironmentVariable key={name} name={name} value={`your_${name.toLowerCase()}_here`} className="px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <EnvironmentVariableName className="truncate text-xs" />
              <EnvironmentVariableRequired className="h-5 px-1.5 text-[10px]">Optional</EnvironmentVariableRequired>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <EnvironmentVariableValue className="max-w-[180px] truncate text-xs" />
              <EnvironmentVariableCopyButton copyFormat="name" />
            </div>
          </EnvironmentVariable>
        ))}
      </EnvironmentVariablesContent>
    </EnvironmentVariables>
  );
}

function AssistantMessage({
  content,
  version,
  message,
  isActive,
  onMessageClick = () => {},
  isStreaming = false,
}: {
  content: string;
  version: number;
  message?: Message;
  isActive?: boolean;
  onMessageClick?: (v: Message) => void;
  isStreaming?: boolean;
}) {
  const allFiles = extractAllCodeBlocks(content);
  const segments = parseReplySegments(content);
  const fileSegments = segments.filter((s) => s.type === "file");
  const storedFiles = (message?.files as Array<{ path?: string; code?: string; content?: string }> | null) || [];
  const envNames = extractEnvNames(content, storedFiles.length ? storedFiles : allFiles);
  const displayFiles = allFiles.length > 0
    ? allFiles
    : fileSegments.length > 0
      ? fileSegments.map((f) => ({
          code: f.code,
          language: f.language,
          path: f.path,
          fullMatch: "",
        }))
      : storedFiles
          .filter((file): file is { path: string; code?: string; content?: string } => Boolean(file.path))
          .map((file) => ({
            code: file.code || file.content || "",
            language: file.path.split(".").pop() || "tsx",
            path: file.path,
            fullMatch: "",
          }));

  // Generate app title for multiple files
  const generateAppTitle = (files: typeof allFiles) => {
    // Look for App.tsx or main component
    const mainFile = files.find(
      (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
    );
    if (mainFile) {
      // Try to extract app name from content
      const appMatch = mainFile.code.match(
        /function\s+(\w+App|\w+Component|\w+)/,
      );
      if (appMatch) {
        return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
      }
    }

    // Fallback: use the first file's name
    const firstFile = files[0];
    if (firstFile) {
      const name =
        firstFile.path
          .split("/")
          .pop()
          ?.replace(/\.\w+$/, "") || "App";
      return toTitleCase(name.replace(/(App|Component)$/, ""));
    }

    return "App";
  };

  const appTitle = generateAppTitle(displayFiles);

  const displayFileCount = displayFiles.length;

  if (displayFileCount > 0) {
    const fileList = displayFiles.map((file) => file.path);
    return (
      <AIMessage from="assistant">
        <MessageContent className="w-full max-w-full">
          <div className="space-y-3">
            <details className="rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer text-foreground">Generated files are collapsed</summary>
              <div className="mt-2 grid gap-1 font-mono">
                {fileList.slice(0, 24).map((path) => (
                  <span key={path} className="truncate">{path}</span>
                ))}
                {fileList.length > 24 ? <span>+{fileList.length - 24} more files</span> : null}
              </div>
            </details>
            <EnvVarsCard names={envNames} />

            <AppVersionButton
              version={version}
              fileCount={displayFileCount}
              appTitle={appTitle}
              generating={false}
              disabled={!message || isStreaming}
              onClick={message ? () => onMessageClick(message) : undefined}
              isActive={isActive}
            />
            {message && !isStreaming ? (
              <button
                type="button"
                onClick={() => onMessageClick(message)}
                className="inline-flex w-full items-center justify-center rounded-lg border border-border/70 bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-fuchsia-400/30 hover:text-foreground"
              >
                Restore checkpoint {version}
              </button>
            ) : null}
          </div>
        </MessageContent>
      </AIMessage>
    );
  }

  if (isPlanResponse(content)) {
    return (
      <AIMessage from="assistant">
        <MessageContent className="w-full max-w-full">
          <PlanResponseCard content={content} isStreaming={isStreaming} />
        </MessageContent>
      </AIMessage>
    );
  }

  return (
    <AIMessage from="assistant">
      <MessageContent className="typography typography-sm max-w-none text-foreground/90">
        <MessageResponse>{content}</MessageResponse>
        <EnvVarsCard names={envNames} />
      </MessageContent>
    </AIMessage>
  );
}
