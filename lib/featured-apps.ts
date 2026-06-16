export type FeaturedApp = {
  slug: string;
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  /** Maps to a key in lib/shadcn-examples.ts for sandbox preview */
  exampleKey?: string;
  /** Optional live generation from the database */
  messageId?: string;
};

export const FEATURED_APPS: FeaturedApp[] = [
  {
    slug: "expense-tracker",
    title: "Expense Tracker",
    description: "Categories, monthly totals, and budget progress with shadcn cards and dialogs.",
    prompt:
      "Build an expense tracker with categories, monthly totals, and charts using shadcn.",
    tags: ["Finance", "Dashboard"],
    exampleKey: "expense tracker",
  },
  {
    slug: "kanban-board",
    title: "Kanban Board",
    description: "Drag-friendly columns, task labels, and a polished project workflow UI.",
    prompt: "Create a Kanban board with To Do, In Progress, and Done columns using shadcn.",
    tags: ["Productivity", "SaaS"],
    exampleKey: "kanban board",
  },
  {
    slug: "habit-tracker",
    title: "Habit Tracker",
    description: "Daily check-ins, streak heatmap, and completion stats in one screen.",
    prompt: "Build a habit tracker with streaks and a weekly heatmap using shadcn.",
    tags: ["Wellness", "Mobile-first"],
    exampleKey: "habit tracker",
  },
  {
    slug: "workspace-crm",
    title: "Workspace CRM",
    description: "Contacts pipeline, deal stages, search, and a detail sheet for follow-ups.",
    prompt:
      "Create a compact CRM workspace with contacts, deal stages, filters, and a detail sheet.",
    tags: ["CRM", "B2B"],
    exampleKey: "workspace crm",
  },
  {
    slug: "notes-app",
    title: "Notes App",
    description: "Markdown notes, tags, search, and sidebar navigation with local persistence.",
    prompt: "Build a notes app with tags, search, and markdown preview using shadcn.",
    tags: ["Writing", "Productivity"],
    exampleKey: "notes app",
  },
  {
    slug: "invoice-builder",
    title: "Invoice Builder",
    description: "Line items, tax, client details, and a print-ready invoice layout.",
    prompt: "Create an invoice builder with line items, tax, and PDF-style preview using shadcn.",
    tags: ["Finance", "B2B"],
    exampleKey: "invoice builder",
  },
  {
    slug: "weather-dashboard",
    title: "Weather Dashboard",
    description: "Saved cities, forecast tabs, and clean metric cards with mock data.",
    prompt: "Build a weather dashboard with city cards, forecast tabs, and shadcn.",
    tags: ["Dashboard", "Consumer"],
    exampleKey: "weather dashboard",
  },
  {
    slug: "analytics-dashboard",
    title: "Analytics Dashboard",
    description: "KPI cards, trend charts, filters, and a revenue overview for SaaS teams.",
    prompt: "Build an analytics dashboard with KPI cards, charts, and date filters using shadcn.",
    tags: ["SaaS", "Analytics"],
    exampleKey: "analytics dashboard",
  },
  {
    slug: "ecommerce-storefront",
    title: "E-commerce Storefront",
    description: "Product grid, cart drawer, filters, and a minimal checkout flow.",
    prompt: "Create an e-commerce storefront with product grid, cart, and filters using shadcn.",
    tags: ["E-commerce", "Retail"],
    exampleKey: "ecommerce storefront",
  },
  {
    slug: "booking-calendar",
    title: "Booking Calendar",
    description: "Availability picker, time slots, and a confirmation panel for appointments.",
    prompt: "Build a booking calendar with availability, time slots, and confirmation using shadcn.",
    tags: ["Scheduling", "Services"],
    exampleKey: "booking calendar",
  },
  {
    slug: "auth-onboarding",
    title: "Auth & Onboarding",
    description: "Sign-in, sign-up, and a multi-step onboarding wizard with validation.",
    prompt: "Create an auth and onboarding flow with sign-in, sign-up, and steps using shadcn.",
    tags: ["Auth", "SaaS"],
    exampleKey: "auth onboarding",
  },
  {
    slug: "settings-console",
    title: "Settings Console",
    description: "Team members, API keys, billing state, and audit events in one admin UI.",
    prompt:
      "Build a minimal settings console with team members, API keys, and billing using shadcn.",
    tags: ["Admin", "SaaS"],
    exampleKey: "settings console",
  },
];

export function getFeaturedAppBySlug(slug: string): FeaturedApp | undefined {
  const normalized = slug.toLowerCase().trim();
  return FEATURED_APPS.find((app) => app.slug === normalized);
}

export function featuredAppPath(slug: string) {
  return `/id/${slug}`;
}

export function featuredAppBuilderHref(prompt: string) {
  return `/?prompt=${encodeURIComponent(prompt)}`;
}