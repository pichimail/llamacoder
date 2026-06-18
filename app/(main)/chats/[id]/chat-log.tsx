"use client";

import type { Chat, Message } from "./page";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
} from "@/lib/utils";
import { Fragment } from "react";
import { Streamdown } from "streamdown";
import { StickToBottom } from "use-stick-to-bottom";
import { AppVersionButton } from "@/components/app-version-button";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { isPlanResponse, PlanResponseCard } from "@/components/plan-mode-panel";

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
    <StickToBottom
      className="relative h-full overflow-y-auto overscroll-contain bg-transparent"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
        role="log"
        aria-label="Conversation history"
        aria-live="polite"
      >
        {/* Initial user prompt - clean modern bubble */}
        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm">
            {chat.prompt}
          </div>
        </div>

        {chat.totalMessages > chat.messages.length && (
          <div className="py-1 text-center text-xs text-muted-foreground">
            Only last messages loaded. Full history not available.
          </div>
        )}

        {chat.messages.slice(2).map((message) => (
          <Fragment key={message.id}>
            {message.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm">
                  {message.content}
                </div>
              </div>
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

        {(reasoningText || isReasoningStreaming) && (
          <Reasoning isStreaming={isReasoningStreaming} className="mb-0">
            <ReasoningTrigger />
            {reasoningText ? (
              <ReasoningContent>{reasoningText}</ReasoningContent>
            ) : null}
          </Reasoning>
        )}

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
      </StickToBottom.Content>
    </StickToBottom>
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

  const appTitle = generateAppTitle(
    allFiles.length > 0
      ? allFiles
      : (fileSegments.map((f) => ({
          code: f.code,
          language: f.language,
          path: f.path,
          fullMatch: "",
        })) as any),
  );

  const displayFileCount = fileSegments.length;

  if (displayFileCount > 0) {
    return (
      <div className="space-y-3">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <div key={i} className="typography typography-sm max-w-none text-foreground/90">
                <Streamdown>{seg.content}</Streamdown>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground"
              role="status"
              aria-label={`Generated file ${seg.path}`}
            >
              <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">📄</span>
              <span className="font-medium truncate max-w-[220px]">{seg.path}</span>
            </div>
          );
        })}

        <AppVersionButton
          version={version}
          fileCount={displayFileCount}
          appTitle={appTitle}
          generating={false}
          disabled={!message || isStreaming}
          onClick={message ? () => onMessageClick(message) : undefined}
          isActive={isActive}
        />
      </div>
    );
  }

  if (isPlanResponse(content)) {
    return <PlanResponseCard content={content} isStreaming={isStreaming} />;
  }

  return (
    <div className="typography typography-sm max-w-none text-foreground/90">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
