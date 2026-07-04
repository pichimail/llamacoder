"use client"

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Archive,
  BookOpen,
  ChevronDown,
  Clock3,
  Copy,
  Folder,
  Grid2X2,
  Home,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
} from "lucide-react"

import type { ProjectOverview } from "@/app/actions/projects"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Project = ProjectOverview[number]

type CommandResult = {
  quickActions: Array<{ id: string; title: string; subtitle: string; href: string; icon: string; type: string }>
  projects: Array<{ id: string; title: string; subtitle: string; href: string; isFavorite: boolean }>
  chats: Array<{ id: string; title: string; subtitle: string; href: string }>
  prompts: Array<{ id: string; title: string; subtitle: string; href: string }>
}

const emptyResults: CommandResult = {
  quickActions: [],
  projects: [],
  chats: [],
  prompts: [],
}

function timeAgo(value: string) {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return "recently"
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || "Request failed")
  return data
}

function iconFor(name: string) {
  const className = "size-4"
  if (name === "plus") return <Plus className={className} />
  if (name === "folder") return <Folder className={className} />
  if (name === "grid") return <Grid2X2 className={className} />
  if (name === "clock") return <Clock3 className={className} />
  if (name === "book") return <BookOpen className={className} />
  if (name === "settings") return <Settings className={className} />
  return <Sparkles className={className} />
}

export function ProjectsDashboard({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState(projects)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [commandOpen, setCommandOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams.get("action") === "new-project")
  const [projectName, setProjectName] = useState("")
  const [commandQuery, setCommandQuery] = useState("")
  const [commandResults, setCommandResults] = useState<CommandResult>(emptyResults)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const recentChats = useMemo(
    () => items.flatMap((project) => project.chats.map((chat) => ({ ...chat, projectName: project.name }))).slice(0, 6),
    [items],
  )
  const favoriteProjects = items.filter((project) => project.isFavorite)
  const visibleProjects = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()
    return items.filter((project) => {
      if (!normalized) return true
      return (
        project.name.toLowerCase().includes(normalized) ||
        project.description.toLowerCase().includes(normalized) ||
        project.chats.some((chat) => chat.title.toLowerCase().includes(normalized))
      )
    })
  }, [deferredQuery, items])

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener("keydown", onKeydown)
    return () => window.removeEventListener("keydown", onKeydown)
  }, [])

  useEffect(() => {
    if (!commandOpen) return
    let cancelled = false
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams()
      if (commandQuery.trim()) params.set("q", commandQuery.trim())
      const response = await fetch(`/api/command-search?${params.toString()}`, { cache: "no-store" }).catch(() => null)
      if (!response?.ok) return
      const data = await response.json().catch(() => null)
      if (!cancelled && data) setCommandResults(data)
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [commandOpen, commandQuery])

  function refreshProjects() {
    router.refresh()
  }

  function run(action: () => Promise<void>) {
    setError("")
    startTransition(async () => {
      try {
        await action()
        refreshProjects()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong")
      }
    })
  }

  function createProject() {
    const name = projectName.trim()
    if (!name) return
    run(async () => {
      const data = await requestJson("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      setProjectName("")
      setCreateOpen(false)
      router.push(`/projects/${data.project.id}`)
    })
  }

  function updateProject(projectId: string, patch: Partial<Pick<Project, "name" | "description" | "isFavorite">>) {
    run(async () => {
      const data = await requestJson(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
      setItems((current) => current.map((project) => (project.id === projectId ? { ...project, ...data.project } : project)))
    })
  }

  function renameProject(project: Project) {
    const nextName = window.prompt("Rename project", project.name)?.trim()
    if (nextName) updateProject(project.id, { name: nextName })
  }

  function openCommandItem(href: string) {
    setCommandOpen(false)
    if (href.includes("action=new-project")) {
      setCreateOpen(true)
      router.replace("/projects")
      return
    }
    router.push(href)
  }

  return (
    <div className="min-h-dvh bg-black text-zinc-100">
      <div className="grid min-h-dvh md:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-black md:flex md:flex-col">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="size-5 rounded-full bg-lime-400 shadow-[0_0_24px_rgba(190,242,100,0.32)]" />
              <span className="truncate text-sm font-medium">Personal</span>
            </div>
            <ChevronDown className="size-4 text-zinc-500" />
          </div>
          <div className="px-2">
            <button type="button" onClick={() => router.push("/")} className="flex h-9 w-full items-center justify-center rounded-md bg-white/8 text-sm font-medium text-zinc-200 transition hover:bg-white/12">
              New Chat
            </button>
          </div>
          <nav className="mt-4 space-y-1 px-2 text-sm text-zinc-500">
            <NavButton icon={<Search className="size-4" />} label="Search" onClick={() => setCommandOpen(true)} />
            <NavLink icon={<Home className="size-4" />} label="Home" href="/" />
            <NavLink icon={<Grid2X2 className="size-4" />} label="Projects" href="/projects" active />
            <NavLink icon={<MessageSquare className="size-4" />} label="Chats" href="/chats" />
            <NavLink icon={<BookOpen className="size-4" />} label="Prompt Library" href="/library" />
          </nav>

          <div className="mt-8 space-y-1 px-4">
            <SectionLabel label="Favorites" />
            {favoriteProjects.slice(0, 5).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block truncate rounded-md px-2 py-1.5 text-sm text-zinc-500 transition hover:bg-white/8 hover:text-zinc-200">
                {project.name}
              </Link>
            ))}
            {favoriteProjects.length === 0 ? <p className="px-2 py-1.5 text-sm text-zinc-700">No favorites yet</p> : null}
          </div>

          <div className="mt-7 space-y-1 px-4">
            <SectionLabel label="Recent Chats" />
            {recentChats.map((chat) => (
              <Link key={chat.id} href={`/chats/${chat.id}`} className="block truncate rounded-md px-2 py-1.5 text-sm text-zinc-500 transition hover:bg-white/8 hover:text-zinc-200">
                {chat.title}
              </Link>
            ))}
          </div>

          <div className="mt-auto space-y-3 p-2">
            <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-zinc-500">Daily credits</div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="size-5 rounded-full bg-lime-400" />
                pichimail
              </div>
              <span className="rounded-md border border-white/10 px-2 py-1 text-sm text-zinc-300">$18</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-5 md:px-9 lg:px-14">
          <div className="mx-auto w-full max-w-[1066px]">
            <header className="pt-6 md:pt-10">
              <div className="flex items-center justify-between gap-3 md:hidden">
                <button type="button" onClick={() => setCommandOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-zinc-300">
                  <Search className="size-4" />
                  Search
                </button>
                <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-zinc-300">
                  <Plus className="size-4" />
                  Project
                </button>
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight md:mt-0">Projects</h1>
              <div className="mt-5 flex gap-2">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onFocus={() => setCommandOpen(true)}
                    placeholder="Search projects..."
                    className="h-10 rounded-md border-white/15 bg-white/[0.055] pl-9 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-white/20"
                  />
                </label>
                <button type="button" onClick={() => setCreateOpen(true)} className="hidden h-10 items-center gap-2 rounded-md border border-white/15 bg-white/[0.055] px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.09] md:inline-flex">
                  <Plus className="size-4" />
                  Project
                </button>
              </div>
              {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
            </header>

            <section className="mt-8 grid gap-x-6 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <article key={project.id} className="group">
                  <Link href={`/projects/${project.id}`} className="block overflow-hidden rounded-md border border-white/10 bg-[#1b1b1b] transition hover:border-white/20">
                    <div className="flex aspect-[1.88] items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.05),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))]">
                      <span className="text-2xl font-semibold tracking-tighter text-white/5">v0</span>
                    </div>
                  </Link>
                  <div className="mt-3 flex items-start gap-3">
                    <Link href={`/projects/${project.id}`} className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black text-white">
                      <span className="h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-white" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/projects/${project.id}`} className="block truncate text-sm font-semibold text-zinc-200 hover:text-white">
                        {project.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-zinc-500">{timeAgo(project.updatedAt)}</p>
                    </div>
                    <ProjectMenu project={project} onRename={() => renameProject(project)} onFavorite={() => updateProject(project.id, { isFavorite: !project.isFavorite })} />
                  </div>
                </article>
              ))}
            </section>

            {visibleProjects.length === 0 ? (
              <div className="mt-12 rounded-md border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-sm font-medium text-zinc-300">No projects found</p>
                <p className="mt-1 text-sm text-zinc-600">Try a different search or create a new project.</p>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#111] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Name the workspace that will hold related chats and builds.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createProject() }} placeholder="Project name" className="border-white/10 bg-white/[0.05] text-zinc-100" />
            <button type="button" onClick={createProject} disabled={isPending || !projectName.trim()} className="h-10 w-full rounded-md bg-white text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-40">
              Create project
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="top-[11%] max-h-[82vh] translate-y-0 overflow-hidden border-white/10 bg-[#101010] p-0 text-zinc-100 shadow-2xl sm:max-w-[512px] data-[state=closed]:slide-out-to-top-[12%] data-[state=open]:slide-in-from-top-[12%]">
          <DialogTitle className="sr-only">Search commands</DialogTitle>
          <Command shouldFilter={false} className="rounded-xl bg-[#101010]">
            <CommandInput value={commandQuery} onValueChange={setCommandQuery} placeholder="Search or type a command..." className="text-zinc-100 placeholder:text-zinc-500" />
            <CommandList className="max-h-[70vh] p-2">
              <CommandEmpty className="py-8 text-sm text-zinc-500">No results found.</CommandEmpty>
              <CommandGroup heading="Quick Actions">
                {commandResults.quickActions.map((item) => (
                  <CommandItem key={item.id} value={item.title} onSelect={() => openCommandItem(item.href)} className="rounded-md px-3 py-3 text-zinc-300 data-[selected=true]:bg-white/10 data-[selected=true]:text-white">
                    {iconFor(item.icon)}
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {commandResults.projects.length > 0 || commandResults.chats.length > 0 || commandResults.prompts.length > 0 ? <CommandSeparator className="bg-white/10" /> : null}
              {commandResults.projects.length > 0 ? (
                <CommandGroup heading="Projects">
                  {commandResults.projects.map((item) => (
                    <CommandItem key={item.id} value={item.title} onSelect={() => openCommandItem(item.href)} className="rounded-md px-3 py-3 text-zinc-300 data-[selected=true]:bg-white/10 data-[selected=true]:text-white">
                      <Folder className="size-4" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {item.isFavorite ? <Star className="size-3.5 fill-current text-zinc-400" /> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {commandResults.chats.length > 0 ? (
                <CommandGroup heading="Chats">
                  {commandResults.chats.map((item) => (
                    <CommandItem key={item.id} value={item.title} onSelect={() => openCommandItem(item.href)} className="rounded-md px-3 py-3 text-zinc-300 data-[selected=true]:bg-white/10 data-[selected=true]:text-white">
                      <Clock3 className="size-4" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {commandResults.prompts.length > 0 ? (
                <CommandGroup heading="Prompt Library">
                  {commandResults.prompts.map((item) => (
                    <CommandItem key={item.id} value={item.title} onSelect={() => openCommandItem(item.href)} className="rounded-md px-3 py-3 text-zinc-300 data-[selected=true]:bg-white/10 data-[selected=true]:text-white">
                      <BookOpen className="size-4" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return <p className="flex items-center justify-between px-2 pb-1 text-xs font-medium text-zinc-600">{label}<ChevronDown className="size-3" /></p>
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 transition hover:bg-white/8 hover:text-zinc-200", active && "bg-white/14 text-zinc-100")}>
      {icon}
      {label}
    </Link>
  )
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/8 hover:text-zinc-200">
      {icon}
      {label}
    </button>
  )
}

function ProjectMenu({ project, onRename, onFavorite }: { project: Project; onRename: () => void; onFavorite: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/8 hover:text-zinc-200" aria-label={`Open actions for ${project.name}`}>
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#111] text-zinc-200">
        <DropdownMenuItem onClick={onFavorite}>
          <Star className="mr-2 size-4" />{project.isFavorite ? "Remove Favorite" : "Add to Favorites"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <Sparkles className="mr-2 size-4" />Rename Project
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(project.id)}>
          <Copy className="mr-2 size-4" />Copy Project ID
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild>
          <Link href={`/chats?project=${project.id}`}>
            <MessageSquare className="mr-2 size-4" />View All Chats
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Archive className="mr-2 size-4" />Env Variables
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
