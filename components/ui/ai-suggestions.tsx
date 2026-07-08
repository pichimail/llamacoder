"use client";

import { ChipScroller, type Chip } from "@/components/ui/chip-scroller";

const SUGGESTIONS: Chip[] = [
  { label: "Premium sneaker store", value: "Build a premium sneaker e-commerce with a 3D rotating hero, filters, cart and Stripe checkout." },
  { label: "Team dashboard", value: "Build a team productivity dashboard with kanban, analytics, and real-time collaboration." },
  { label: "Booking platform", value: "Build a booking app with a calendar, availability, payments and an admin panel." },
  { label: "AI chat app", value: "Build an AI chat app with streaming responses, conversation history, and a model selector." },
  { label: "Portfolio site", value: "Build a sleek personal portfolio with project case studies, a blog, and a contact form." },
  { label: "SaaS landing", value: "Build a modern SaaS landing page with pricing tiers, testimonials, and a waitlist form." },
  { label: "Analytics hub", value: "Build an analytics dashboard with charts, filters, date ranges, and export to CSV." },
];

/**
 * Horizontal swiping suggestion chips shown under the chat composer.
 * Replaces the previous flex-wrap button row with a drag-to-scroll rail.
 */
export function AiSuggestions({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <ChipScroller
      chips={SUGGESTIONS}
      onSelect={onSelect}
      aria-label="Prompt suggestions"
      className="mb-2"
    />
  );
}
