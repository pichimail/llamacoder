import type { FeaturedApp } from "@/lib/featured-apps";

/** Original motion-forward landing prompts (not third-party copies). */
export const MOTION_TEMPLATES: FeaturedApp[] = [
  {
    slug: "motion-hero-reveal",
    title: "Hero Reveal",
    description: "Cinematic hero with staggered headline reveal, gradient mesh, and scroll cue.",
    prompt:
      "Build a cinematic SaaS hero with staggered text reveal on load, soft gradient mesh background, floating product mockup, and a scroll indicator. Use Framer Motion and shadcn.",
    tags: ["Motion", "Hero", "SaaS"],
    source: "motion",
  },
  {
    slug: "motion-pricing-orbit",
    title: "Pricing Orbit",
    description: "Three-tier pricing with hover lift, glow borders, and animated feature list.",
    prompt:
      "Create an animated pricing page with three tiers, hover lift cards, glowing borders on the featured plan, and staggered feature list reveals using Framer Motion and shadcn.",
    tags: ["Motion", "Pricing"],
    source: "motion",
  },
  {
    slug: "motion-agency-showcase",
    title: "Agency Showcase",
    description: "Portfolio grid with parallax thumbnails and case-study modal transitions.",
    prompt:
      "Build a creative agency landing page with a parallax portfolio grid, smooth case-study modal transitions, bold typography, and dark theme using shadcn + Framer Motion.",
    tags: ["Motion", "Agency"],
    source: "motion",
  },
  {
    slug: "motion-product-launch",
    title: "Product Launch",
    description: "Device mockup, feature tabs with slide transitions, and waitlist CTA.",
    prompt:
      "Design a product launch landing page with animated device mockup, tabbed feature sections with slide transitions, social proof row, and waitlist CTA. Use shadcn and Framer Motion.",
    tags: ["Motion", "Launch"],
    source: "motion",
  },
  {
    slug: "motion-scroll-story",
    title: "Scroll Story",
    description: "Pinned sections that animate copy and metrics as the user scrolls.",
    prompt:
      "Create a scroll-driven storytelling landing page with pinned sections, animated metrics counters, and progressive feature reveals using Framer Motion and shadcn.",
    tags: ["Motion", "Scroll"],
    source: "motion",
  },
  {
    slug: "motion-ai-studio",
    title: "AI Studio",
    description: "Glassmorphism prompt panel, animated tool chips, and live preview frame.",
    prompt:
      "Build an AI studio landing page with glassmorphism prompt panel, animated tool chips, gradient aurora background, and a live preview frame using shadcn + Framer Motion.",
    tags: ["Motion", "AI"],
    source: "motion",
  },
];

export function getMotionTemplateBySlug(slug: string) {
  return MOTION_TEMPLATES.find((template) => template.slug === slug);
}