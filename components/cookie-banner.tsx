"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies-accepted");
    if (!accepted) {
      // delay show for better UX
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookies-accepted", "true");
    setShow(false);
  };

  const decline = () => {
    // minimal tracking only
    localStorage.setItem("cookies-accepted", "minimal");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-md rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-md">
      <p className="text-sm text-foreground/90 mb-3">
        We use essential cookies for authentication and analytics. No selling of data.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={accept} className="flex-1 md:flex-none">Accept all</Button>
        <Button size="sm" variant="outline" onClick={decline} className="flex-1 md:flex-none">Essential only</Button>
        <Button size="sm" variant="ghost" asChild className="w-full md:w-auto">
          <a href="/privacy">Learn more</a>
        </Button>
      </div>
    </div>
  );
}
