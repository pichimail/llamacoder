"use client";

import { BookOpen, Sparkles } from "lucide-react";

import { GradientText } from "@/components/ui/gradient-text";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const KNOWLEDGE_SECTIONS = [
  {
    title: "Ask mode",
    body: "Best for questions, refinements, and targeted changes. The assistant answers directly without generating a full app.",
  },
  {
    title: "Plan mode",
    body: "Get a structured plan with architecture, components, and routing before you build.",
  },
  {
    title: "Agent mode",
    body: "Generate a full working application — pages, components, API routes, and styling from your prompt.",
  },
  {
    title: "Attachments",
    body: "Upload screenshots, source files, or documents. Chinna-Coder analyzes them to infer pages, components, and routes.",
  },
  {
    title: "Preset chips",
    body: "Tap a category below the composer to cycle through curated prompts for SaaS, dashboards, e-commerce, and more.",
  },
  {
    title: "Enhance prompt",
    body: "When you type your own prompt, use the enhance icon inside the composer to rewrite it for clearer results.",
  },
];

export function KnowledgeAssistantButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open app knowledge assistant"
          className="group fixed bottom-5 left-5 z-50 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:left-[calc(var(--sidebar-width,16rem)+1.25rem)]"
        >
          <GradientText className="rounded-full border border-border/60 px-4 py-2.5 shadow-lg transition-transform duration-300 group-hover:scale-[1.03]">
            <span className="relative z-10 flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="size-4 text-indigo-500" />
              <span>App guide</span>
              <BookOpen className="size-4 opacity-70" />
            </span>
          </GradientText>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-indigo-500" />
            Chinna-Coder knowledge base
          </DialogTitle>
          <DialogDescription>
            Quick reference for modes, presets, and how to get the best results on the home page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {KNOWLEDGE_SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3"
            >
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}