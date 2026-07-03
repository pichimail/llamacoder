"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Checkpoint } from "@/components/ai-elements/checkpoint";
import { Plan } from "@/components/ai-elements/plan";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Brain, Archive, ListTodo, Layers, Sparkles } from "lucide-react";
import type { Message } from "./page";

interface ChatPanelProps {
  chat: {
    id: string;
    title: string;
  };
  messages: Message[];
  activeMessage?: Message;
  onMessageClick?: (message: Message) => void;
  streamText?: string;
  reasoningText?: string;
  isReasoningStreaming?: boolean;
  isStreaming?: boolean;
  showPlanMode?: boolean;
  checkpoints?: Array<{ id: string; version: number; label: string }>;
  onRestoreCheckpoint?: (id: string) => void;
  tasks?: Array<{ id: string; title: string; status: "pending" | "in-progress" | "completed"; description?: string }>;
}

function isInternalUserPrompt(content: string) {
  return /Generated code validation failed before preview commit|Preview error:|Current artifact source:|The current app has errors|Apply the smallest working fix|Auto-fix mode|Return complete updated versions/i.test(content);
}

export function ChatPanel({
  chat,
  messages,
  activeMessage,
  onMessageClick,
  streamText = "",
  reasoningText = "",
  isReasoningStreaming = false,
  isStreaming = false,
  showPlanMode = false,
  checkpoints = [],
  onRestoreCheckpoint,
  tasks = [],
}: ChatPanelProps) {
  const [accordionValue, setAccordionValue] = useState<string[]>(["messages", "reasoning"]);
  const visibleMessages = messages.filter(
    (message) => message.role !== "system" && !(message.role === "user" && isInternalUserPrompt(message.content)),
  );

  // Derive tasks from streaming or existing messages
  const activeTasks = tasks.length > 0 ? tasks : (
    isStreaming ? [
      { id: "1", title: "Analyzing requirements", status: "completed" as const, description: "Understanding user prompt" },
      { id: "2", title: "Generating code structure", status: "in-progress" as const, description: "Creating file architecture" },
      { id: "3", title: "Building preview", status: "pending" as const, description: "Compiling and rendering" },
    ] : []
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Conversation</h2>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span>{visibleMessages.length} messages</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="w-full px-2 py-2"
        >
          {/* Messages Section */}
          <AccordionItem value="messages" className="border-b border-border/50">
            <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-fuchsia-400" />
                <span>Messages</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {visibleMessages.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 py-2">
                {visibleMessages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => onMessageClick?.(message)}
                    className={`w-full rounded-md border p-3 text-left text-sm transition ${
                      activeMessage?.id === message.id
                        ? "border-fuchsia-400/50 bg-fuchsia-950/20"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 size-2 shrink-0 rounded-full ${
                        message.role === "user" ? "bg-blue-400" : "bg-emerald-400"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{message.role}</span>
                          {message.createdAt && (
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-foreground">
                          {message.content.slice(0, 150)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {isStreaming && (
                  <div className="rounded-md border border-border/50 p-3">
                    <Shimmer className="text-sm">Generating response...</Shimmer>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Reasoning Section */}
          {(reasoningText || isReasoningStreaming) && (
            <AccordionItem value="reasoning" className="border-b border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Brain className="size-4 text-violet-400" />
                  <span>Reasoning</span>
                  {isReasoningStreaming && (
                    <Sparkles className="ml-auto size-3 animate-pulse text-amber-400" />
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="py-2">
                  <Reasoning
                    isStreaming={isReasoningStreaming}
                    className="rounded-lg border border-border/50 bg-muted/30 p-3"
                  >
                    {reasoningText || "Analyzing your request..."}
                  </Reasoning>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Tasks Section */}
          {activeTasks.length > 0 && (
            <AccordionItem value="tasks" className="border-b border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <ListTodo className="size-4 text-amber-400" />
                  <span>Tasks</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {activeTasks.filter(t => t.status === "completed").length}/{activeTasks.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 py-2">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${
                          task.status === "completed" ? "bg-emerald-400" :
                          task.status === "in-progress" ? "bg-amber-400 animate-pulse" :
                          "bg-muted-foreground"
                        }`} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{task.title}</div>
                          {task.description && (
                            <div className="mt-1 text-xs text-muted-foreground">{task.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Plan Mode Section */}
          {showPlanMode && (
            <AccordionItem value="plan" className="border-b border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <span>Plan</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="py-2">
                  <Plan
                    isStreaming={isStreaming}
                    className="rounded-lg border border-border/50 bg-muted/20"
                  >
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-foreground">{chat.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {streamText || "Plan will appear here when you use Plan mode..."}
                      </p>
                    </div>
                  </Plan>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Checkpoints Section */}
          {checkpoints.length > 0 && (
            <AccordionItem value="checkpoints" className="border-b border-border/50">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Archive className="size-4 text-emerald-400" />
                  <span>Checkpoints</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {checkpoints.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 py-2">
                  {checkpoints.slice().reverse().map((checkpoint) => (
                    <Checkpoint
                      key={checkpoint.id}
                      className="rounded-lg border border-border/50 hover:border-emerald-400/50 hover:bg-emerald-950/20 transition"
                    >
                      <button
                        onClick={() => onRestoreCheckpoint?.(checkpoint.id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="size-4 text-emerald-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {checkpoint.label}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Version {checkpoint.version}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Restore →
                          </div>
                        </div>
                      </button>
                    </Checkpoint>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
