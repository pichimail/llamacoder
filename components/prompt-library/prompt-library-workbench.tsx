"use client"

import { useDeferredValue, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Library,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type PromptLibraryItem = {
  id: string
  title: string
  body: string
  category: string
  tone: string
  tags: string[]
  variables: string[]
  visibility: string
  shareToken: string | null
  useCount: number
  createdAt: string
  updatedAt: string
}

const STARTER_BODY = `Build a {product_type} for {audience}.

Core workflow:
- {workflow}

Design direction:
- Visual mood: {mood}
- Must include: {must_have}

Quality bar:
- Responsive, accessible, production-grade, and preview-safe.`

const PROMPT_RECIPES = [
  { label: "Product app", value: "Build a production-ready {app_type} with dashboard, detail views, empty states, settings, and responsive mobile navigation." },
  { label: "Landing page", value: "Create a premium landing page for {brand} with a clear offer, strong first viewport, social proof, pricing, FAQ, and conversion-ready CTA flow." },
  { label: "Admin tool", value: "Build an admin console for {team} with filters, table actions, role-aware settings, audit history, and safe destructive flows." },
  { label: "Game", value: "Create a playable {game_type} with scoring, restart, responsive controls, polished art direction, and clear win/loss states." },
] as const

function extractVariables(body: string) {
  return Array.from(new Set(Array.from(body.matchAll(/\{([^{}]+)\}/g)).map((match) => match[1].trim()).filter(Boolean)))
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || "Request failed")
  return data
}

export function PromptLibraryWorkbench({ initialPrompts }: { initialPrompts: PromptLibraryItem[] }) {
  const router = useRouter()
  const [prompts, setPrompts] = useState(initialPrompts)
  const [selectedId, setSelectedId] = useState(initialPrompts[0]?.id ?? "")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [title, setTitle] = useState(initialPrompts[0]?.title ?? "Launch-ready app prompt")
  const [body, setBody] = useState(initialPrompts[0]?.body ?? STARTER_BODY)
  const [tone, setTone] = useState(initialPrompts[0]?.tone ?? "Balanced")
  const [promptCategory, setPromptCategory] = useState(initialPrompts[0]?.category ?? "General")
  const [tags, setTags] = useState(initialPrompts[0]?.tags.join(", ") ?? "responsive, production")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const deferredQuery = useDeferredValue(query)
  const variables = useMemo(() => extractVariables(body), [body])
  const categories = useMemo(() => Array.from(new Set(["all", ...prompts.map((prompt) => prompt.category)])), [prompts])

  const filteredPrompts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    return prompts.filter((prompt) => {
      const matchesCategory = category === "all" || prompt.category === category
      const matchesQuery =
        !normalizedQuery ||
        prompt.title.toLowerCase().includes(normalizedQuery) ||
        prompt.body.toLowerCase().includes(normalizedQuery) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      return matchesCategory && matchesQuery
    })
  }, [category, deferredQuery, prompts])

  function selectPrompt(prompt: PromptLibraryItem) {
    setSelectedId(prompt.id)
    setTitle(prompt.title)
    setBody(prompt.body)
    setTone(prompt.tone)
    setPromptCategory(prompt.category)
    setTags(prompt.tags.join(", "))
  }

  function run(action: () => Promise<void>) {
    setError("")
    startTransition(async () => {
      try {
        await action()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong")
      }
    })
  }

  function savePrompt() {
    run(async () => {
      const payload = {
        title,
        body,
        tone,
        category: promptCategory,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        variables,
        visibility: "private",
      }
      const data = selectedId
        ? await requestJson(`/api/prompts/${selectedId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await requestJson("/api/prompts", { method: "POST", body: JSON.stringify(payload) })
      const saved = data.prompt as PromptLibraryItem
      setPrompts((items) => [saved, ...items.filter((item) => item.id !== saved.id)])
      setSelectedId(saved.id)
      router.refresh()
    })
  }

  function newPrompt(recipe = STARTER_BODY) {
    setSelectedId("")
    setTitle("Untitled prompt")
    setBody(recipe)
    setTone("Balanced")
    setPromptCategory("General")
    setTags("draft")
  }

  function transformPrompt(mode: "spec" | "critique" | "shorten") {
    if (mode === "spec") {
      setBody((current) => `${current.trim()}

Implementation constraints:
- Use real app routing and complete interactive states.
- Include loading, empty, error, and success states.
- Keep the first preview buildable without placeholder imports.`)
    }
    if (mode === "critique") {
      setBody((current) => `Review this request first, identify ambiguities, then build the strongest complete version:

${current}`)
    }
    if (mode === "shorten") {
      setBody((current) => current.split("\n").map((line) => line.trim()).filter(Boolean).join("\n"))
    }
  }

  function usePrompt(prompt: PromptLibraryItem) {
    run(async () => {
      await requestJson(`/api/prompts/${prompt.id}`, { method: "POST", body: JSON.stringify({ action: "use" }) })
      router.push(`/?prompt=${encodeURIComponent(prompt.body)}`)
    })
  }

  function sharePrompt(prompt: PromptLibraryItem) {
    run(async () => {
      const data = await requestJson(`/api/prompts/${prompt.id}`, { method: "POST", body: JSON.stringify({ action: "share" }) })
      const updated = data.prompt as PromptLibraryItem
      setPrompts((items) => items.map((item) => item.id === updated.id ? updated : item))
      const url = `${window.location.origin}/library/shared/${updated.shareToken}`
      await navigator.clipboard?.writeText(url)
    })
  }

  function deletePrompt(prompt: PromptLibraryItem) {
    run(async () => {
      await requestJson(`/api/prompts/${prompt.id}`, { method: "DELETE" })
      setPrompts((items) => items.filter((item) => item.id !== prompt.id))
      if (selectedId === prompt.id) newPrompt()
      router.refresh()
    })
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Prompt operating system</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Library</h1>
          </div>
          <Button onClick={() => newPrompt()} className="gap-2">
            <Plus className="size-4" />
            New prompt
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="rounded-lg">
            <CardContent className="space-y-3 p-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search saved prompts" />
              </label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                {categories.map((item) => <option key={item} value={item}>{item === "all" ? "All categories" : item}</option>)}
              </select>
            </CardContent>
          </Card>

          {filteredPrompts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No prompts found</EmptyTitle>
                <EmptyDescription>Create one or adjust the filters.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {filteredPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => selectPrompt(prompt)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedId === prompt.id ? "border-foreground bg-muted" : "border-border hover:border-foreground/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-1 text-sm font-semibold">{prompt.title}</h2>
                    <Badge variant="outline">{prompt.useCount}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{prompt.body}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="secondary">{prompt.category}</Badge>
                    <Badge variant="outline">{prompt.tone}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Library className="size-4" />
                Composer lab
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                {PROMPT_RECIPES.map((recipe) => (
                  <Button key={recipe.label} type="button" variant="outline" size="sm" onClick={() => newPrompt(recipe.value)} className="bg-transparent">
                    {recipe.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Prompt title" />
                <Input value={promptCategory} onChange={(event) => setPromptCategory(event.target.value)} placeholder="Category" />
                <Input value={tone} onChange={(event) => setTone(event.target.value)} placeholder="Tone" />
              </div>
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={14} className="resize-y text-sm leading-6" placeholder="Write a reusable prompt..." />
              <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Tags, comma separated" />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => transformPrompt("spec")} className="gap-2 bg-transparent">
                  <Sparkles className="size-4" />
                  Add build spec
                </Button>
                <Button type="button" variant="outline" onClick={() => transformPrompt("critique")} className="gap-2 bg-transparent">
                  <Wand2 className="size-4" />
                  Add critique pass
                </Button>
                <Button type="button" variant="outline" onClick={() => transformPrompt("shorten")} className="bg-transparent">
                  Tighten
                </Button>
              </div>

              {variables.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Detected variables</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variables.map((variable) => <Badge key={variable} variant="outline">{`{${variable}}`}</Badge>)}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={savePrompt} disabled={isPending || !title.trim() || !body.trim()} className="gap-2">
                  <Save className="size-4" />
                  Save prompt
                </Button>
                {selectedId ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => usePrompt(prompts.find((prompt) => prompt.id === selectedId)!)} className="gap-2 bg-transparent">
                      <Send className="size-4" />
                      Use in composer
                    </Button>
                    <Button type="button" variant="outline" onClick={() => sharePrompt(prompts.find((prompt) => prompt.id === selectedId)!)} className="gap-2 bg-transparent">
                      <Share2 className="size-4" />
                      Share
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(body)} className="gap-2 bg-transparent">
                      <Copy className="size-4" />
                      Copy
                    </Button>
                    <Button type="button" variant="outline" onClick={() => deletePrompt(prompts.find((prompt) => prompt.id === selectedId)!)} className="gap-2 bg-transparent text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
