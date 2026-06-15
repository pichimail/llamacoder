import "server-only";
import dedent from "dedent";

export const examples = {
  "workspace crm": {
    prompt:
      "Create a compact CRM workspace with contacts, deal stages, filters, notes, and a detail sheet using shadcn-style controls.",
    response: dedent(`
      \`\`\`tsx{path=app/page.tsx}
      "use client";
      import { useMemo, useState } from "react";
      import { Search, Plus, SlidersHorizontal } from "lucide-react";
      import { Button } from "@/components/ui/button";
      import { Input } from "@/components/ui/input";
      import { Badge } from "@/components/ui/badge";
      import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

      const contacts = [
        { name: "Mira Shah", company: "Northline", stage: "Proposal", value: "$24k" },
        { name: "Jon Bell", company: "ParcelGrid", stage: "Qualified", value: "$12k" },
        { name: "Ava Chen", company: "SignalWorks", stage: "Won", value: "$44k" },
      ];

      export default function App() {
        const [query, setQuery] = useState("");
        const [selected, setSelected] = useState<(typeof contacts)[number] | null>(null);
        const filtered = useMemo(() => contacts.filter((c) => JSON.stringify(c).toLowerCase().includes(query.toLowerCase())), [query]);
        return (
          <main className="min-h-screen bg-zinc-950 p-5 text-zinc-100">
            <section className="mx-auto max-w-5xl">
              <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div><h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1><p className="text-sm text-zinc-400">Deals, notes, and next steps.</p></div>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />New lead</Button>
              </header>
              <div className="my-4 flex gap-2">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder="Search contacts" /></div>
                <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button>
              </div>
              <div className="divide-y divide-zinc-800 border-y border-zinc-800">
                {filtered.map((contact) => (
                  <button key={contact.name} onClick={() => setSelected(contact)} className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 py-4 text-left hover:text-white">
                    <span><b>{contact.name}</b><span className="ml-2 text-zinc-500">{contact.company}</span></span>
                    <Badge variant="outline">{contact.stage}</Badge><span className="font-mono text-sm">{contact.value}</span>
                  </button>
                ))}
              </div>
            </section>
            <Sheet open={!!selected} onOpenChange={() => setSelected(null)}><SheetContent><SheetHeader><SheetTitle>{selected?.name}</SheetTitle></SheetHeader><p className="mt-4 text-sm text-muted-foreground">Next action, notes, and deal context live here.</p></SheetContent></Sheet>
          </main>
        );
      }
      \`\`\`
    `),
  },
  "settings console": {
    prompt:
      "Build a minimal settings console with team members, API keys, billing state, audit events, and shadcn dialogs.",
    response: dedent(`
      \`\`\`tsx{path=app/page.tsx}
      "use client";
      import { useState } from "react";
      import { KeyRound, Shield, UserPlus } from "lucide-react";
      import { Button } from "@/components/ui/button";
      import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
      import { Input } from "@/components/ui/input";

      export default function App() {
        const [keys, setKeys] = useState(["prod_sk_live", "preview_token"]);
        const [name, setName] = useState("");
        return (
          <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
            <div className="mx-auto max-w-4xl">
              <header className="mb-6 flex items-center justify-between"><div><h1 className="text-3xl font-semibold">Settings</h1><p className="text-sm text-neutral-500">Security, keys, and team access.</p></div><Button><UserPlus className="mr-2 h-4 w-4" />Invite</Button></header>
              <section className="grid gap-6 md:grid-cols-[220px_1fr]"><nav className="space-y-2 text-sm text-neutral-400"><p className="text-neutral-100"><Shield className="mr-2 inline h-4 w-4" />General</p><p><KeyRound className="mr-2 inline h-4 w-4" />API keys</p></nav><div className="space-y-4 border-l border-neutral-800 pl-6">
                <Dialog><DialogTrigger asChild><Button variant="outline">New key</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create key</DialogTitle></DialogHeader><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" /><Button onClick={() => { if (name) setKeys([...keys, name]); setName(""); }}>Create</Button></DialogContent></Dialog>
                <div className="divide-y divide-neutral-800 border-y border-neutral-800">{keys.map((key) => <div key={key} className="flex items-center justify-between py-3"><span className="font-mono text-sm">{key}</span><Button size="sm" variant="ghost">Revoke</Button></div>)}</div>
              </div></section>
            </div>
          </main>
        );
      }
      \`\`\`
    `),
  },
};
