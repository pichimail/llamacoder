"use client";

import { useState } from "react";
import { 
  Activity, 
  BarChart3, 
  Gauge, 
  RefreshCw, 
  Search,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock data to match the admin UI theme and layout
const initialLogs = [
  { 
    id: 1, 
    model: "claude-3-5-sonnet", 
    score: 0.94, 
    provider: "Anthropic", 
    time: "3m ago", 
    quality: "Excellent",
    status: "success",
    outputPreview: "Built a responsive SaaS dashboard with charts and auth.",
    chatId: "demo123"
  },
  { 
    id: 2, 
    model: "gpt-4o", 
    score: 0.89, 
    provider: "OpenAI", 
    time: "12m ago", 
    quality: "Good",
    status: "success",
    outputPreview: "Created a marketing landing with animations.",
    chatId: "demo124"
  },
  { 
    id: 3, 
    model: "gemini-1.5-pro", 
    score: 0.82, 
    provider: "Google", 
    time: "25m ago", 
    quality: "Good",
    status: "success",
    outputPreview: "Admin console with tables and forms.",
    chatId: null
  },
];

export default function BraintrustAdminPage() {
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = logs.filter(log => 
    log.model.toLowerCase().includes(search.toLowerCase()) ||
    log.provider.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = (logs.reduce((sum, log) => sum + log.score, 0) / logs.length).toFixed(2);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newLog = {
        id: Date.now(),
        model: ["claude-3-5-sonnet", "gpt-4o", "gemini-1.5-pro"][Math.floor(Math.random() * 3)],
        score: 0.75 + Math.random() * 0.22,
        provider: ["Anthropic", "OpenAI", "Google"][Math.floor(Math.random() * 3)],
        time: "just now",
        quality: Math.random() > 0.3 ? "Excellent" : "Good",
        status: "success",
        outputPreview: "New dynamic artifact generated successfully.",
        chatId: "live" + Date.now(),
      };
      setLogs([newLog, ...logs.slice(0, 8)]);
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Braintrust Logs</h1>
          <p className="text-muted-foreground">Quality scores, debugging and model comparisons</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">Connected</Badge>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats cards - matching the rest of the admin dashboard UI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total logs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Activity className="size-5" /> {logs.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Models compared</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="size-5" /> {new Set(logs.map(l => l.model)).size}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average score</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gauge className="size-5" /> {avgScore}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">Connected</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Generation Events</CardTitle>
              <CardDescription>Prompt debugging, scores and model performance</CardDescription>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search model or provider..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</TableCell>
                      <TableCell className="font-medium">{log.model}</TableCell>
                      <TableCell className="text-muted-foreground">{log.provider}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className="font-mono text-xs w-9">{log.score.toFixed(2)}</span>
                          <progress
                            className="h-1.5 w-full flex-1 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
                            value={Math.round(log.score * 100)}
                            max={100}
                            aria-label={`Quality score ${Math.round(log.score * 100)} percent`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.quality === "Excellent" ? "default" : "secondary"}>
                          {log.quality}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px] text-xs text-muted-foreground line-clamp-1">{log.outputPreview}</TableCell>
                      <TableCell>
                        {log.chatId ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/chats/${log.chatId}`}>
                              Open <ExternalLink className="ml-1 size-3" />
                            </Link>
                          </Button>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No matching logs.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
