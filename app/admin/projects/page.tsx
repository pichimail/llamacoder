"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, FolderKanban, MoreHorizontal, Search, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  owner: { id: string; name: string | null; email: string | null; image: string | null; plan: string };
  latestChat: { id: string; title: string; model: string; updatedAt: string; isArchived: boolean } | null;
  latestDeployment: { status: string; previewUrl: string | null; productionUrl: string | null } | null;
  counts: { chats: number; members: number; files: number; deployments: number; envVars: number };
};

type ProjectsPayload = {
  projects: ProjectRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: { totalProjects: number; activeChats: number; readyDeployments: number };
};

function projectStatusVariant(status: string) {
  if (["ready", "active", "success"].includes(status)) return "secondary" as const;
  if (["failed", "error"].includes(status)) return "default" as const;
  return "outline" as const;
}

function ProjectActions({ project }: { project: ProjectRow }) {
  const deploymentUrl = project.latestDeployment?.productionUrl || project.latestDeployment?.previewUrl;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label={`Project actions for ${project.name}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Project actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/projects/${project.id}`}><FolderKanban className="size-4" />Open project</Link>
        </DropdownMenuItem>
        {project.latestChat ? (
          <DropdownMenuItem asChild>
            <Link href={`/chats/${project.latestChat.id}`}><ArrowUpRight className="size-4" />Open latest chat</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href={`/admin/users?search=${encodeURIComponent(project.owner.email || project.owner.name || "")}`}><Users className="size-4" />View owner</Link>
        </DropdownMenuItem>
        {deploymentUrl ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={deploymentUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open deployment</a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminProjectsPage() {
  const [data, setData] = useState<ProjectsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 20;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
    if (debouncedSearch) params.set("search", debouncedSearch);
    const response = await fetch(`/api/admin/projects?${params}`, { cache: "no-store" }).catch(() => null);
    const json = await response?.json().catch(() => null);
    if (response?.ok) {
      setData(json);
      setFailed(false);
    } else {
      setData({ projects: [], total: 0, page, pageSize, summary: { totalProjects: 0, activeChats: 0, readyDeployments: 0 } });
      setFailed(true);
    }
  }, [debouncedSearch, page, sort]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / pageSize), 1);
  const cards = useMemo(() => [
    { label: "Total projects", value: data?.summary.totalProjects ?? 0 },
    { label: "Active chats", value: data?.summary.activeChats ?? 0 },
    { label: "Ready deployments", value: data?.summary.readyDeployments ?? 0 },
  ], [data]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin control for workspaces, owners, chats, files, and deployments.</p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/"><FolderKanban className="size-4" />Create new project</Link>
        </Button>
      </div>

      {failed ? (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">Could not load projects. Check admin access and database connectivity.</CardContent></Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
              {data ? <p className="mt-2 text-3xl font-semibold tabular-nums">{card.value.toLocaleString()}</p> : <Skeleton className="mt-2 h-9 w-20" />}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, owner, or description..." className="h-11 rounded-xl pl-9" />
          </div>
          <Select value={sort} onValueChange={(value) => { setPage(1); setSort(value); }}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="created">Recently created</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All projects</CardTitle>
          <CardDescription>Open the workspace, latest chat, owner record, or live deployment from each row.</CardDescription>
        </CardHeader>
        <CardContent>
          {data === null ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
          ) : data.projects.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No projects match these filters.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Chats</TableHead>
                      <TableHead className="text-right">Files</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.projects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Link href={`/projects/${project.id}`} className="font-medium underline-offset-4 hover:underline">{project.name}</Link>
                          <p className="max-w-[320px] truncate text-xs text-muted-foreground">{project.description || project.latestChat?.title || "Workspace ready for generation."}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarImage src={project.owner.image ?? undefined} alt="" />
                              <AvatarFallback className="text-xs">{(project.owner.name || project.owner.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="max-w-[160px] truncate text-sm">{project.owner.name || project.owner.email || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={projectStatusVariant(project.status)} className="rounded-full capitalize">{project.status}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{project.counts.chats}</TableCell>
                        <TableCell className="text-right tabular-nums">{project.counts.files}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right"><ProjectActions project={project} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {data.projects.map((project) => (
                  <div key={project.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/projects/${project.id}`} className="truncate font-medium underline-offset-4 hover:underline">{project.name}</Link>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description || project.latestChat?.title || "Workspace ready for generation."}</p>
                      </div>
                      <ProjectActions project={project} />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <Avatar className="size-7">
                        <AvatarImage src={project.owner.image ?? undefined} alt="" />
                        <AvatarFallback className="text-xs">{(project.owner.name || project.owner.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 truncate">{project.owner.name || project.owner.email || "Unknown"}</span>
                      <Badge variant={projectStatusVariant(project.status)} className="ml-auto rounded-full capitalize">{project.status}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-muted/50 p-2"><strong className="block text-base">{project.counts.chats}</strong>Chats</div>
                      <div className="rounded-xl bg-muted/50 p-2"><strong className="block text-base">{project.counts.files}</strong>Files</div>
                      <div className="rounded-xl bg-muted/50 p-2"><strong className="block text-base">{project.counts.members}</strong>Members</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9 rounded-lg" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" />Prev</Button>
                  <Button variant="outline" size="sm" className="h-9 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="size-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
