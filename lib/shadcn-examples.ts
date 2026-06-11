import "server-only";
import dedent from "dedent";
import blog from "./examples/blog.json";
import calculator from "./examples/calculator.json";
import landing from "./examples/landing.json";
import pomodoro from "./examples/pomodoro.json";
// quiz example removed for cleanliness but import kept if needed later
// import quiz from "./examples/quiz.json";

export const examples = {
  "landing page": {
    prompt:
      "Create a modern, responsive landing page for a fictional SaaS company",
    response: `
\`\`\`
${landing.content}
\`\`\`
`,
  },
  "blog app": {
    prompt: "make me a personal blog",
    response: `
The user wants me to create a personal blog using Next.js with several specific features:

Clean and modern design
About me page
Blog post archive
Contact form
Categories for travel, food, and technology
Responsive design
Commenting system

This is a complex multi-page application with different sections and features. Since this involves multiple distinct systems (blog posts, categories, contact form, commenting system), I should use the TodoManager to break this down into manageable tasks.
First, I should generate design inspiration since the user wants a "clean and modern design" but hasn't provided specific visual requirements. Then I'll search the repo to understand the codebase structure and create a systematic plan.

\`\`\`
${blog.content}
\`\`\`
    `,
  },
  "calculator app": {
    prompt: "make me a calculator app",
    response: dedent(`
The user wants me to build a Next.js calculator application with:

- Basic arithmetic operations (addition, subtraction, multiplication, division)
- User-friendly interface with clear display
- Buttons for each operation
- Decimal number support
- Clear input functionality
- Responsive design for desktop and mobile
- Keyboard shortcuts for enhanced usability
- Proper multi-file structure for maintainability

\`\`\`tsx{path=src/App.tsx}
import Calculator from "./components/Calculator";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="calculator-theme">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Calculator />
      </div>
    </ThemeProvider>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/Calculator.tsx}
${calculator.content}
\`\`\`

\`\`\`ts{path=src/types/calculator.ts}
export type Operation = "+" | "-" | "×" | "÷" | null;

export interface CalculatorState {
  displayValue: string;
  previousValue: number | null;
  operation: Operation;
  waitingForOperand: boolean;
}

export interface CalculatorButton {
  value: string;
  display: string;
  type: "digit" | "operation" | "function" | "equals";
  className?: string;
}
\`\`\`

\`\`\`ts{path=src/utils/calculator.ts}
import { CalculatorState, Operation } from "../types/calculator";

export const performOperation = (
  firstOperand: number,
  secondOperand: number,
  operation: Operation
): number => {
  switch (operation) {
    case "+":
      return firstOperand + secondOperand;
    case "-":
      return firstOperand - secondOperand;
    case "×":
      return firstOperand * secondOperand;
    case "÷":
      return firstOperand / secondOperand;
    default:
      return secondOperand;
  }
};

export const formatDisplay = (value: number): string => {
  // Format the display value to show up to 10 digits
  const stringValue = value.toString();
  if (stringValue.length > 10) {
    return value.toExponential(5);
  }
  return stringValue;
};
\`\`\`
    `),
  },
  "quiz app": {
    prompt:
      "Make me a quiz app about American history. Make sure to give the user an explanation on each question whether they got it right or wrong and keep a score going",
    response: dedent(`
The user wants me to create a quiz app about American history with the following requirements:

- Quiz questions about American history
- Show explanations for each question whether right or wrong
- Keep track of score
- Create a well-structured multi-file application

This is a straightforward app that should be organized into multiple files for better structure and maintainability. I'll create separate files for components, types, and utilities.

\`\`\`tsx{path=src/App.tsx}
import Quiz from "./components/Quiz";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Quiz />
      </div>
    </div>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/Quiz.tsx}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// ... rest of the quiz component code
\`\`\`

\`\`\`ts{path=src/types/quiz.ts}
export type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

export type QuizState = {
  currentQuestionIndex: number;
  score: number;
  answers: number[];
  showExplanation: boolean;
};
\`\`\`
      `),
  },
  "pomodoro timer": {
    prompt: "make a pomodoro timer",
    response: dedent(`
      I'll create a Pomodoro timer with adjustable focus and break times, along with a sound notification when the timer completes. Since no reference image/app was provided in your prompt, I'll create a clean and functional design with a proper multi-file structure.

\`\`\`tsx{path=src/App.tsx}
import PomodoroTimer from "./components/PomodoroTimer";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="pomodoro-theme">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PomodoroTimer />
      </div>
    </ThemeProvider>
  );
}
\`\`\`

\`\`\`tsx{path=src/components/PomodoroTimer.tsx}
${pomodoro.content}
\`\`\`

\`\`\`tsx{path=src/components/ThemeProvider.tsx}
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) as Theme : undefined) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
        
      root.classList.add(systemTheme);
      return;
    }
    
    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
    
  return context;
}
\`\`\`

\`\`\`ts{path=src/types/timer.ts}
export type TimerMode = "work" | "shortBreak" | "longBreak";

export interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

export interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  completedSessions: number;
}
\`\`\`
    `),
  },

  // NEW compact full self-contained shadcn whole-app examples (state + localStorage "backend", only shadcn + lucide, theme match)
  "task manager": {
    prompt: "Build a clean task manager with priorities, search, filters using shadcn.",
    response: dedent(`
A full Task Manager. CRUD + filters + persistence. Pure shadcn.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";

type Task = { id: string; title: string; priority: "low"|"medium"|"high"; dueDate: string; completed: boolean; };

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState<"all"|"active"|"done">("all");
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Task|null>(null);
  const [form, setForm] = useState({title:"", priority:"medium" as const, dueDate:""});

  useEffect(() => { const s = localStorage.getItem("tasks"); if(s) setTasks(JSON.parse(s)); }, []);
  useEffect(() => { localStorage.setItem("tasks", JSON.stringify(tasks)); }, [tasks]);

  const save = () => {
    if(!form.title.trim()) return;
    const t = { id: editing?.id || Date.now().toString(36), title: form.title.trim(), priority: form.priority, dueDate: form.dueDate, completed: editing?.completed ?? false };
    setTasks(prev => editing ? prev.map(x => x.id===editing.id ? t : x) : [...prev, t as any]);
    setForm({title:"",priority:"medium",dueDate:""}); setEditing(null); setOpen(false);
  };

  const filtered = tasks.filter(t => {
    const m = t.title.toLowerCase().includes(search.toLowerCase());
    if(filter==="active") return m && !t.completed; if(filter==="done") return m && t.completed; return m;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>New Task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing?"Edit":"New"} Task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Priority</Label>
                    <select className="w-full rounded-md border bg-background p-2" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as any})}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                  <div><Label>Due</Label><Input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div>
                </div>
              </div>
              <Button onClick={save} className="mt-2 w-full">{editing?"Save":"Add Task"}</Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="flex gap-1">
            {(["all","active","done"] as const).map(f => <Button key={f} variant={filter===f?"default":"outline"} size="sm" onClick={()=>setFilter(f)}>{f}</Button>)}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length===0 && <div className="text-center py-8 text-muted-foreground">No tasks</div>}
          {filtered.map(t => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Checkbox checked={t.completed} onCheckedChange={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,completed:!x.completed}:x))}/>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={t.completed?"line-through text-muted-foreground":""}>{t.title}</span>
                    <Badge variant={t.priority==="high"?"destructive":t.priority==="medium"?"default":"secondary"}>{t.priority}</Badge>
                  </div>
                  {t.dueDate && <div className="text-xs text-muted-foreground">Due {t.dueDate}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={()=>{setEditing(t);setForm({title:t.title,priority:t.priority,dueDate:t.dueDate});setOpen(true);}}><Edit2 className="h-4 w-4"/></Button>
                <Button size="icon" variant="ghost" onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}><Trash2 className="h-4 w-4"/></Button>
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

  "contacts crm": {
    prompt: "Build a contacts CRM with table, search, add via dialog using shadcn.",
    response: dedent(`
Full Contacts CRM. Table + filters + favorites + persistence. Only shadcn.

\`\`\`tsx{path=src/App.tsx}
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Star, Trash2 } from "lucide-react";

type Contact = {id:string; name:string; email:string; company:string; favorite:boolean;};

export default function ContactsCRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState(""); const [company, setCompany] = useState("all"); const [open, setOpen] = useState(false);
  const [form, setForm] = useState({name:"",email:"",company:""});

  useEffect(()=>{const s=localStorage.getItem("contacts"); if(s)setContacts(JSON.parse(s)); else setContacts([{id:"1",name:"Alex Chen",email:"alex@acme.co",company:"Acme",favorite:true}]);},[]);
  useEffect(()=>{localStorage.setItem("contacts",JSON.stringify(contacts));},[contacts]);

  const filtered = contacts.filter(c => {
    const ok = c.name.toLowerCase().includes(q.toLowerCase()) || c.email.includes(q);
    return ok && (company==="all" || c.company===company);
  }).sort((a,b)=>+b.favorite - +a.favorite);

  const companies = Array.from(new Set(contacts.map(c=>c.company)));

  const add = () => {
    if(!form.name) return;
    setContacts(p => [...p, {id:Date.now().toString(36), ...form, favorite:false} as any]);
    setForm({name:"",email:"",company:""}); setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-semibold">Contacts</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Contact</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
                <Input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
                <Input placeholder="Company" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/>
              </div>
              <Button onClick={add} className="w-full mt-2">Add Contact</Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)}/></div>
          <select className="rounded-md border bg-background px-3" value={company} onChange={e=>setCompany(e.target.value)}>
            <option value="all">All</option>{companies.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name} {c.favorite && <Star className="inline h-3 w-3 text-yellow-500 fill-yellow-500"/>}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell><Badge variant="outline">{c.company}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={()=>setContacts(p=>p.map(x=>x.id===c.id?{...x,favorite:!x.favorite}:x))}><Star className={\`h-4 w-4 \${c.favorite?"fill-yellow-500 text-yellow-500":""}\`}/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>setContacts(p=>p.filter(x=>x.id!==c.id))}><Trash2 className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
\`\`\`
    `),
  },
};
