"use client";

import { Button } from "@/components/ui/button";

const suggestions = [
  { label: "Premium sneaker store", value: "Build a premium sneaker e-commerce with 3D rotating hero, filters, cart and Stripe checkout." },
  { label: "Team dashboard", value: "Build a team productivity dashboard with kanban, analytics, and real-time collaboration." },
  { label: "Booking platform", value: "Build a booking app with calendar, availability, payments and admin panel." },
];

export function AiSuggestions({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <Button key={i} variant="outline" size="sm" className="border-white/10 hover:border-white/30" onClick={() => onSelect(s.value)}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}
