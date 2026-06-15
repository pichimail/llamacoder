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

  "expense tracker": {
    prompt: "Build an expense tracker with categories, monthly totals, and charts using shadcn.",
    response: dedent(`
Full expense tracker with categories, filters, and summary cards. Pure shadcn + localStorage.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Wallet } from "lucide-react";

type Expense = { id: string; title: string; amount: number; category: string; date: string; };
const CATEGORIES = ["Food", "Transport", "Rent", "Fun", "Other"];

export default function ExpenseTracker() {
  const [items, setItems] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10) });

  useEffect(() => { const raw = localStorage.getItem("expenses"); if (raw) setItems(JSON.parse(raw)); }, []);
  useEffect(() => { localStorage.setItem("expenses", JSON.stringify(items)); }, [items]);

  const monthItems = useMemo(() => items.filter((item) => item.date.startsWith(month)), [items, month]);
  const total = monthItems.reduce((sum, item) => sum + item.amount, 0);
  const byCategory = CATEGORIES.map((category) => ({
    category,
    amount: monthItems.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
  })).filter((row) => row.amount > 0);

  const addExpense = () => {
    const amount = Number(form.amount);
    if (!form.title.trim() || !amount) return;
    setItems((prev) => [...prev, { id: Date.now().toString(36), title: form.title.trim(), amount, category: form.category, date: form.date }]);
    setForm({ title: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
            <p className="text-sm text-muted-foreground">Track spending by category and month.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-2 w-full" onClick={addExpense}>Save expense</Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This month</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-3xl font-semibold"><Wallet className="h-5 w-5 text-emerald-500" />\${total.toFixed(2)}</CardContent></Card>
          <Card className="md:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Filter month</CardTitle></CardHeader><CardContent><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Category breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {byCategory.length === 0 && <p className="text-sm text-muted-foreground">No expenses for this month.</p>}
            {byCategory.map((row) => (
              <div key={row.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm"><span>{row.category}</span><span className="font-medium">\${row.amount.toFixed(2)}</span></div>
                <Progress value={total ? (row.amount / total) * 100 : 0} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {monthItems.map((item) => (
            <Card key={item.id}><CardContent className="flex items-center gap-3 p-4">
              <div className="flex-1"><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.date}</div></div>
              <Badge variant="outline">{item.category}</Badge>
              <div className="font-semibold">\${item.amount.toFixed(2)}</div>
              <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },

  "habit tracker": {
    prompt: "Build a habit tracker with streaks, weekly grid, and shadcn cards.",
    response: dedent(`
Habit tracker with streaks, weekly completion grid, and persistence.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, Plus, Trash2 } from "lucide-react";

type Habit = { id: string; name: string; color: string; checks: string[]; };
const COLORS = ["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-amber-500"];
const weekDays = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(); date.setDate(date.getDate() - (6 - index));
  return date.toISOString().slice(0, 10);
});

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState("");

  useEffect(() => { const raw = localStorage.getItem("habits"); if (raw) setHabits(JSON.parse(raw)); }, []);
  useEffect(() => { localStorage.setItem("habits", JSON.stringify(habits)); }, [habits]);

  const addHabit = () => {
    if (!name.trim()) return;
    setHabits((prev) => [...prev, { id: Date.now().toString(36), name: name.trim(), color: COLORS[prev.length % COLORS.length], checks: [] }]);
    setName("");
  };

  const toggle = (habitId: string, day: string) => {
    setHabits((prev) => prev.map((habit) => habit.id !== habitId ? habit : ({
      ...habit,
      checks: habit.checks.includes(day) ? habit.checks.filter((value) => value !== day) : [...habit.checks, day],
    })));
  };

  const streak = (checks: string[]) => {
    let count = 0;
    for (let offset = 0; offset < 30; offset++) {
      const date = new Date(); date.setDate(date.getDate() - offset);
      if (checks.includes(date.toISOString().slice(0, 10))) count++; else break;
    }
    return count;
  };

  const completion = useMemo(() => habits.length ? Math.round((habits.reduce((sum, habit) => sum + habit.checks.filter((day) => weekDays.includes(day)).length, 0) / (habits.length * 7)) * 100) : 0, [habits]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">Build streaks with a simple weekly grid.</p>
        </div>
        <Card><CardContent className="flex gap-2 p-4"><Input placeholder="New habit" value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={addHabit}><Plus className="mr-2 h-4 w-4" />Add</Button></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Weekly completion</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{completion}%</CardContent></Card>
        <div className="space-y-4">
          {habits.map((habit) => (
            <Card key={habit.id}><CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><span className={\`h-3 w-3 rounded-full \${habit.color}\`} /><span className="font-medium">{habit.name}</span><Badge variant="secondary" className="gap-1"><Flame className="h-3 w-3" />{streak(habit.checks)} day streak</Badge></div>
                <Button size="icon" variant="ghost" onClick={() => setHabits((prev) => prev.filter((row) => row.id !== habit.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <label key={day} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3 text-xs">
                    <span className="text-muted-foreground">{new Date(day).toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <Checkbox checked={habit.checks.includes(day)} onCheckedChange={() => toggle(habit.id, day)} />
                  </label>
                ))}
              </div>
            </CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },

  "kanban board": {
    prompt: "Build a kanban board with drag columns, priorities, and shadcn.",
    response: dedent(`
Kanban board with column filters, priorities, and local persistence.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

type Status = "backlog" | "doing" | "done";
type Task = { id: string; title: string; status: Status; priority: "low" | "medium" | "high"; };
const COLUMNS: { key: Status; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "doing", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => { const raw = localStorage.getItem("kanban"); if (raw) setTasks(JSON.parse(raw)); }, []);
  useEffect(() => { localStorage.setItem("kanban", JSON.stringify(tasks)); }, [tasks]);

  const addTask = () => {
    if (!title.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now().toString(36), title: title.trim(), status: "backlog", priority: "medium" }]);
    setTitle("");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Kanban</h1>
          <div className="flex gap-2"><Input placeholder="New card" value={title} onChange={(e) => setTitle(e.target.value)} /><Button onClick={addTask}><Plus className="mr-2 h-4 w-4" />Add</Button></div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <Card key={column.key} className="bg-muted/30">
              <CardHeader><CardTitle className="text-base">{column.label}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {tasks.filter((task) => task.status === column.key).map((task) => (
                  <Card key={task.id}><CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{task.title}</div>
                      <Button size="icon" variant="ghost" onClick={() => setTasks((prev) => prev.filter((row) => row.id !== task.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}>{task.priority}</Badge>
                      <Select value={task.status} onValueChange={(value: Status) => setTasks((prev) => prev.map((row) => row.id === task.id ? { ...row, status: value } : row))}>
                        <SelectTrigger className="h-8 w-[8.5rem]"><SelectValue /></SelectTrigger>
                        <SelectContent>{COLUMNS.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent></Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },

  "notes app": {
    prompt: "Build a notes app with folders, search, markdown preview, and shadcn.",
    response: dedent(`
Notes app with sidebar folders, search, and markdown preview.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2 } from "lucide-react";

type Note = { id: string; title: string; body: string; folder: string; updatedAt: string; };
const FOLDERS = ["Personal", "Work", "Ideas"];

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("Personal");

  useEffect(() => { const raw = localStorage.getItem("notes"); if (raw) { const parsed = JSON.parse(raw) as Note[]; setNotes(parsed); setActiveId(parsed[0]?.id ?? null); } }, []);
  useEffect(() => { localStorage.setItem("notes", JSON.stringify(notes)); }, [notes]);

  const filtered = useMemo(() => notes.filter((note) => note.folder === folder && (note.title + note.body).toLowerCase().includes(search.toLowerCase())), [notes, folder, search]);
  const active = notes.find((note) => note.id === activeId) ?? filtered[0];

  const createNote = () => {
    const note = { id: Date.now().toString(36), title: "Untitled note", body: "", folder, updatedAt: new Date().toISOString() };
    setNotes((prev) => [note, ...prev]); setActiveId(note.id);
  };

  const updateActive = (patch: Partial<Note>) => {
    if (!active) return;
    setNotes((prev) => prev.map((note) => note.id === active.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[240px_1fr]">
        <Card className="h-fit"><CardHeader><CardTitle className="text-base">Folders</CardTitle></CardHeader><CardContent className="space-y-2">
          {FOLDERS.map((item) => <Button key={item} variant={folder === item ? "default" : "ghost"} className="w-full justify-start" onClick={() => setFolder(item)}>{item}</Button>)}
          <Button className="w-full" onClick={createNote}><Plus className="mr-2 h-4 w-4" />New note</Button>
        </CardContent></Card>
        <div className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search notes" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">{filtered.map((note) => <Card key={note.id} className={active?.id === note.id ? "border-primary" : ""} onClick={() => setActiveId(note.id)}><CardContent className="cursor-pointer p-4"><div className="font-medium">{note.title}</div><div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.body || "Empty note"}</div><Badge className="mt-2" variant="outline">{note.folder}</Badge></CardContent></Card>)}</div>
            {active ? <Card><CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between"><Input value={active.title} onChange={(e) => updateActive({ title: e.target.value })} className="text-lg font-semibold" /><Button size="icon" variant="ghost" onClick={() => setNotes((prev) => prev.filter((note) => note.id !== active.id))}><Trash2 className="h-4 w-4" /></Button></div>
              <Tabs defaultValue="edit"><TabsList><TabsTrigger value="edit">Edit</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>
                <TabsContent value="edit"><Textarea className="min-h-[320px]" value={active.body} onChange={(e) => updateActive({ body: e.target.value })} /></TabsContent>
                <TabsContent value="preview"><div className="min-h-[320px] whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm">{active.body || "Nothing to preview yet."}</div></TabsContent>
              </Tabs>
            </CardContent></Card> : <Card><CardContent className="p-8 text-sm text-muted-foreground">Select or create a note.</CardContent></Card>}
          </div>
        </div>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },

  "invoice builder": {
    prompt: "Build an invoice generator with line items, tax, PDF-style preview using shadcn.",
    response: dedent(`
Invoice builder with editable line items, tax, totals, and print-ready preview.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";

type LineItem = { id: string; description: string; qty: number; rate: number; };

export default function InvoiceBuilder() {
  const [client, setClient] = useState("Acme Studio");
  const [taxRate, setTaxRate] = useState(8);
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "Design sprint", qty: 1, rate: 2400 },
    { id: "2", description: "Frontend implementation", qty: 12, rate: 180 },
  ]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.rate, 0), [items]);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Invoice</h1>
          <Button onClick={() => setItems((prev) => [...prev, { id: Date.now().toString(36), description: "New line item", qty: 1, rate: 0 }])}><Plus className="mr-2 h-4 w-4" />Add item</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Client</CardTitle></CardHeader><CardContent><Input value={client} onChange={(e) => setClient(e.target.value)} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Tax rate (%)</CardTitle></CardHeader><CardContent><Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} /></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>Total</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Input value={item.description} onChange={(e) => setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, description: e.target.value } : row))} /></TableCell>
                    <TableCell><Input type="number" className="w-20" value={item.qty} onChange={(e) => setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, qty: Number(e.target.value) || 0 } : row))} /></TableCell>
                    <TableCell><Input type="number" className="w-28" value={item.rate} onChange={(e) => setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, rate: Number(e.target.value) || 0 } : row))} /></TableCell>
                    <TableCell className="font-medium">\${(item.qty * item.rate).toFixed(2)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><div><div className="text-sm text-muted-foreground">Bill to</div><div className="text-xl font-semibold">{client}</div></div><div className="text-right text-sm text-muted-foreground">Invoice #{Date.now().toString().slice(-6)}</div></div>
            <Separator />
            <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{item.description} × {item.qty}</span><span>\${(item.qty * item.rate).toFixed(2)}</span></div>)}</div>
            <Separator />
            <div className="space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>\${subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Tax ({taxRate}%)</span><span>\${tax.toFixed(2)}</span></div><div className="flex justify-between text-base font-semibold"><span>Total</span><span>\${total.toFixed(2)}</span></div></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },

  "weather dashboard": {
    prompt: "Build a weather dashboard with city cards, forecast tabs, and shadcn.",
    response: dedent(`
Weather dashboard with saved cities, forecast tabs, and mock data persistence.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Sun, Wind, Plus, Trash2 } from "lucide-react";

type CityWeather = { id: string; city: string; temp: number; condition: string; humidity: number; wind: number; forecast: { day: string; high: number; low: number; icon: "sun" | "rain" }[]; };
const seed = (city: string): CityWeather => ({
  id: Date.now().toString(36) + city,
  city,
  temp: 68 + city.length,
  condition: city.length % 2 ? "Partly cloudy" : "Clear skies",
  humidity: 42 + (city.length % 20),
  wind: 8 + (city.length % 7),
  forecast: ["Mon", "Tue", "Wed", "Thu"].map((day, index) => ({ day, high: 72 + index, low: 58 + index, icon: index % 2 ? "rain" : "sun" })),
});

export default function WeatherDashboard() {
  const [cities, setCities] = useState<CityWeather[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => { const raw = localStorage.getItem("weather-cities"); if (raw) setCities(JSON.parse(raw)); else setCities([seed("San Francisco"), seed("New York")]); }, []);
  useEffect(() => { localStorage.setItem("weather-cities", JSON.stringify(cities)); }, [cities]);

  const addCity = () => {
    if (!query.trim()) return;
    setCities((prev) => [seed(query.trim()), ...prev]);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-3xl font-semibold tracking-tight">Weather</h1><p className="text-sm text-muted-foreground">Saved cities with a clean forecast view.</p></div>
          <div className="flex gap-2"><Input placeholder="Add city" value={query} onChange={(e) => setQuery(e.target.value)} /><Button onClick={addCity}><Plus className="mr-2 h-4 w-4" />Add</Button></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {cities.map((city) => (
            <Card key={city.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div><CardTitle>{city.city}</CardTitle><p className="text-sm text-muted-foreground">{city.condition}</p></div>
                <Button size="icon" variant="ghost" onClick={() => setCities((prev) => prev.filter((row) => row.id !== city.id))}><Trash2 className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3"><div className="text-5xl font-semibold">{city.temp}°</div><Badge variant="secondary"><Wind className="mr-1 h-3 w-3" />{city.wind} mph</Badge><Badge variant="outline">{city.humidity}% humidity</Badge></div>
                <Tabs defaultValue="forecast"><TabsList><TabsTrigger value="forecast">Forecast</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
                  <TabsContent value="forecast" className="grid grid-cols-4 gap-2">{city.forecast.map((day) => <div key={day.day} className="rounded-lg border border-border p-3 text-center text-xs"><div className="font-medium">{day.day}</div><div className="mt-2 flex justify-center">{day.icon === "sun" ? <Sun className="h-4 w-4 text-amber-500" /> : <CloudRain className="h-4 w-4 text-sky-500" />}</div><div className="mt-2">{day.high}° / {day.low}°</div></div>)}</TabsContent>
                  <TabsContent value="details" className="text-sm text-muted-foreground">Mock weather data for {city.city}. Swap with a real API in production.</TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },
};

const exampleMatchers: Array<{ key: keyof typeof examples; patterns: RegExp }> = [
  { key: "expense tracker", patterns: /expense|budget|spending|finance/i },
  { key: "habit tracker", patterns: /habit|streak|routine|daily/i },
  { key: "kanban board", patterns: /kanban|board|column|workflow|project/i },
  { key: "notes app", patterns: /note|journal|markdown|memo/i },
  { key: "invoice builder", patterns: /invoice|billing|quote|receipt/i },
  { key: "weather dashboard", patterns: /weather|forecast|climate/i },
  { key: "workspace crm", patterns: /contact|crm|customer|client/i },
  { key: "settings console", patterns: /settings|preferences|profile|account/i },
  { key: "kanban board", patterns: /task|todo|to-do|checklist/i },
];

export function pickExampleForPrompt(prompt: string) {
  const match = exampleMatchers.find((entry) =>
    entry.patterns.test(prompt),
  );
  const key = match?.key ?? "workspace crm";
  return { key, example: examples[key] };
}

export function getShadcnFewShotPrompt(userPrompt = "") {
  const { key, example } = pickExampleForPrompt(userPrompt);
  return `
## REFERENCE EXAMPLE (${key})
Use this as a pattern for structure, shadcn usage, and single-file whole-app composition when appropriate.

User prompt:
${example.prompt}

Assistant response pattern:
${example.response.trim()}
`;
}
