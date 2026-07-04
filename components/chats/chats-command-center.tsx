"use client"

import { useDeferredValue, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Archive,
  Boxes,
  ChevronDown,
  Copy,
  FolderKanban,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Star,
} from "lucide-react"

import type { ProjectOverview } from "@/app/actions/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Project = ProjectOverview[number]
type Chat = Project["chats"][number] & { projectName: string }

function formatAge(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
}

function flattenChats(projects: Project[]): Chat[] {
  return projects.flatMap((project) =>
    project.chats.map((chat) => ({
      ...chat,
      projectName: project.name,
    })),
  )
}

async function mutate(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || "Request failed")
  }
  return response.json()
}

export function ChatsCommandCenter({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialProject = searchParams.get("project") || "all"
  const [query, setQuery] = useState("")
  const [projectFilter, setProjectFilter] = useState(initialProject)
  const [statusFilter, setStatusFilter] = useState<"active" | "pinned" | "archived" | "all">("active")
  const [newProjectName, setNewProjectName] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const deferredQuery = useDeferredValue(query)

  const chats = useMemo(() => flattenChats(projects), [projects])
  const activeProject = projects.find((project) => project.id === projectFilter)
  const filteredChats = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    return chats.filter((chat) => {
      const matchesProject = projectFilter === "all" || chat.projectId === projectFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !chat.isArchived) ||
        (statusFilter === "pinned" && chat.isPinned) ||
        (statusFilter === "archived" && chat.isArchived)
      const matchesQuery =
        !normalizedQuery ||
        chat.title.toLowerCase().includes(normalizedQuery) ||
        chat.prompt.toLowerCase().includes(normalizedQuery) ||
        chat.projectName.toLowerCase().includes(normalizedQuery)
      return matchesProject && matchesStatus && matchesQuery
    })
  }, [chats, deferredQuery, projectFilter, statusFilter])

  const totalArchived = chats.filter((chat) => chat.isArchived).length
  const totalPinned = chats.filter((chat) => chat.isPinned).length

  function refreshWithProject(projectId: string) {
    setProjectFilter(projectId)
    const params = new URLSearchParams(searchParams.toString())
    if (projectId === "all") params.delete("project")
    else params.set("project", projectId)
    router.replace(`/chats${params.toString() ? `?${params.toString()}` : ""}`)
  }

  function run(action: () => Promise<unknown>) {
    setError("")
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong")
      }
    })
  }

  function createProject() {
    const name = newProjectName.trim()
    if (!name) return
    run(async () => {
      await mutate("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      setNewProjectName("")
    })
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Workspace control</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Chats and projects</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/library">
              <Button variant="outline" className="gap-2 bg-transparent">
                <Star className="size-4" />
                Prompt Library
              </Button>
            </Link>
            <Link href="/">
              <Button className="gap-2">
                <Plus className="size-4" />
                New Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FolderKanban className="size-4" />
                Project views
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <button
                type="button"
                onClick={() => refreshWithProject("all")}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                  projectFilter === "all" ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                <span>All projects</span>
                <span>{chats.length}</span>
              </button>
              {projects.map((project) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => refreshWithProject(project.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                    projectFilter === project.id ? "bg-foreground text-background" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  <span>{project.counts.chats}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Create project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <Input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Project name" />
              <Button type="button" onClick={createProject} disabled={isPending || !newProjectName.trim()} className="w-full">
                Add project
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Projects" value={projects.length} />
            <MetricCard label="Pinned" value={totalPinned} />
            <MetricCard label="Archived" value={totalArchived} />
          </div>

          <Card className="rounded-lg">
            <CardContent className="p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search title, prompt, or project" />
                </label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="active">Active</option>
                  <option value="pinned">Pinned</option>
                  <option value="archived">Archived</option>
                  <option value="all">Everything</option>
                </select>
                <select value={projectFilter} onChange={(event) => refreshWithProject(event.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="all">All projects</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
              {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>

          {activeProject ? (
            <div className="rounded-lg border border-border bg-muted/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{activeProject.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{activeProject.description || "No project description yet."}</p>
                </div>
                <Link href={`/projects/${activeProject.id}`} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
                  Open project route
                </Link>
              </div>
            </div>
          ) : null}

          {filteredChats.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No matching chats</EmptyTitle>
                <EmptyDescription>Try another project, status, or search term.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/">
                  <Button>Create a new chat</Button>
                </Link>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-3">
              {filteredChats.map((chat) => (
                <ChatRow key={chat.id} chat={chat} projects={projects} isPending={isPending} run={run} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function ChatRow({
  chat,
  projects,
  isPending,
  run,
}: {
  chat: Chat
  projects: Project[]
  isPending: boolean
  run: (action: () => Promise<unknown>) => void
}) {
  return (
    <Card className={cn("rounded-lg transition hover:border-foreground/20", chat.isArchived && "opacity-60")}>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
        <Link href={`/chats/${chat.id}`} className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{chat.title}</h3>
            {chat.isPinned ? <Badge variant="secondary">Pinned</Badge> : null}
            {chat.isArchived ? <Badge variant="outline">Archived</Badge> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{chat.prompt}</p>
          <p className="mt-2 text-xs text-muted-foreground">{chat.projectName} · {chat.model} · {formatAge(chat.updatedAt)}</p>
        </Link>

        <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <Boxes className="size-4 text-muted-foreground" />
          <select
            value={chat.projectId ?? ""}
            disabled={isPending}
            onChange={(event) => run(() => mutate(`/api/chats/${chat.id}`, { method: "PATCH", body: JSON.stringify({ projectId: event.target.value || null }) }))}
            className="min-w-0 flex-1 bg-transparent outline-none"
            aria-label={`Move ${chat.title} to project`}
          >
            <option value="">No project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <ChevronDown className="size-4 text-muted-foreground" />
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="bg-transparent">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open chat actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Chat actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => run(() => mutate(`/api/chats/${chat.id}`, { method: "PATCH", body: JSON.stringify({ isPinned: !chat.isPinned }) }))}>
              <Pin className="mr-2 size-4" />{chat.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(() => mutate(`/api/chats/${chat.id}`, { method: "POST", body: JSON.stringify({ action: "duplicate" }) }))}>
              <Copy className="mr-2 size-4" />Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => run(() => mutate(`/api/chats/${chat.id}`, { method: "PATCH", body: JSON.stringify({ isArchived: !chat.isArchived }) }))}>
              <Archive className="mr-2 size-4" />{chat.isArchived ? "Restore" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
