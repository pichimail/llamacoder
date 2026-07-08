"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const COOKIE_KEY = "chinna-coder:cookie-preference";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COOKIE_KEY)) return;
    const timer = window.setTimeout(() => setShow(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(value: "all" | "essential") {
    localStorage.setItem(COOKIE_KEY, value);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl rounded-xl border border-lime-300/20 bg-[#090a07]/95 p-3 text-stone-200 shadow-2xl shadow-black/40 backdrop-blur-xl sm:bottom-5 sm:p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-medium text-stone-50">Cookies keep your workspace signed in.</p>
          <p className="mt-1 text-xs leading-5 text-stone-400">
            We use essential cookies for authentication and optional analytics to improve build quality. No selling of personal data.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button size="sm" className="rounded-lg bg-lime-200 text-stone-950 hover:bg-lime-100" onClick={() => choose("all")}>
            Accept all
          </Button>
          <Button size="sm" variant="outline" className="rounded-lg border-lime-300/25 bg-transparent text-lime-100 hover:bg-lime-300/10" onClick={() => choose("essential")}>
            Essential only
          </Button>
          <Button size="sm" variant="ghost" asChild className="col-span-2 rounded-lg text-stone-300 hover:bg-white/5 hover:text-lime-100 sm:col-span-1">
            <Link href="/privacy">Learn more</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
