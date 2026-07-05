import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "$0",
    credits: "100 credits / month",
    models: "Starter ChinnaLLM model tier",
    backendMode: "Not included",
    customDomains: "Not included",
    cta: "Start free",
    disabled: false,
  },
  {
    name: "Pro",
    price: "$19",
    credits: "1,000 credits / month",
    models: "Starter and Pro ChinnaLLM model tiers",
    backendMode: "Included",
    customDomains: "Included",
    cta: "Upgrade coming soon",
    disabled: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    credits: "Unlimited credits",
    models: "All ChinnaLLM model tiers",
    backendMode: "Included",
    customDomains: "Included",
    cta: "Upgrade coming soon",
    disabled: true,
  },
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-12 text-foreground md:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Pricing</h1>
          <p className="text-sm leading-6 text-muted-foreground md:text-base">
            Pick the Chinna-Coder plan that matches your build volume, model access, and deployment needs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className="flex min-h-[420px] flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                  {plan.price === "Custom" ? null : <span className="text-muted-foreground"> / month</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <PlanItem label="Credit grant" value={plan.credits} />
                <PlanItem label="Model access" value={plan.models} />
                <PlanItem label="Backend mode" value={plan.backendMode} />
                <PlanItem label="Custom domains" value={plan.customDomains} />
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.disabled ? "outline" : "default"} disabled={plan.disabled}>
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

function PlanItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Check className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm leading-5 text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}
