"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Wand2, TestTube2, Save } from "lucide-react";

export type McpServerFormData = {
  id?: string;
  name: string;
  url: string;
  transport: "http" | "sse" | "stdio";
  authType: "none" | "bearer" | "header" | "basic" | "token";
  secret: string; // plaintext only in UI, sent to backend for encrypt
  description: string;
  enabled: boolean;
};

interface McpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<McpServerFormData>;
  onSaved?: (server: any) => void; // called after successful save, with public server
  mode?: "add" | "edit";
  onAttachToGeneration?: (server: any) => void; // optional: after save or quick, attach to current prompt/generation
  title?: string;
}

export function McpServerDialog({
  open,
  onOpenChange,
  initialData,
  onSaved,
  mode = "add",
  onAttachToGeneration,
  title,
}: McpServerDialogProps) {
  const [form, setForm] = useState<McpServerFormData>({
    name: "",
    url: "",
    transport: "http",
    authType: "bearer",
    secret: "",
    description: "",
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState(""); // for smart paste / url

  useEffect(() => {
    if (open && initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name || "",
        url: initialData.url || "",
        transport: (initialData.transport as any) || "http",
        authType: (initialData.authType as any) || "bearer",
        secret: "", // never prefill secret
        description: initialData.description || "",
        enabled: initialData.enabled !== false,
      });
      setPasteInput(initialData.url || "");
    } else if (open && !initialData) {
      // reset for new
      setForm({
        name: "",
        url: "",
        transport: "http",
        authType: "bearer",
        secret: "",
        description: "",
        enabled: true,
      });
      setPasteInput("");
      setTestResult(null);
    }
  }, [open, initialData]);

  const updateForm = (patch: Partial<McpServerFormData>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  // Smart auto-fill logic
  const handleSmartFill = async () => {
    const input = pasteInput.trim();
    if (!input) return;

    let url = form.url;
    let name = form.name;
    let desc = form.description;

    // If looks like URL
    if (input.startsWith("http") || input.includes("://") || input.includes("localhost")) {
      url = input.split(/\s+/)[0]; // first token as url
      // Try to derive nice name
      try {
        const u = new URL(url.includes("://") ? url : `https://${url}`);
        const host = u.hostname.replace(/^www\./, "");
        const pathPart = u.pathname.split("/").filter(Boolean).pop() || "";
        name = pathPart ? `${pathPart} MCP` : `${host} MCP`;
        desc = `Auto-detected from ${host}`;
      } catch {
        name = name || "MCP Server";
      }
    } else {
      // Pasted text - simple heuristics
      const lower = input.toLowerCase();
      if (lower.includes("postgres") || lower.includes("database") || lower.includes("sql")) {
        name = name || "Postgres MCP";
        desc = desc || "Database MCP server";
      } else if (lower.includes("github")) {
        name = name || "GitHub MCP";
        desc = desc || "GitHub integration MCP";
      } else if (lower.includes("slack")) {
        name = name || "Slack MCP";
      } else if (lower.includes("search") || lower.includes("brave")) {
        name = name || "Search MCP";
      } else {
        name = name || "Custom MCP Server";
      }
      // Try extract url from text
      const urlMatch = input.match(/https?:\/\/[^\s"'`]+/);
      if (urlMatch) url = urlMatch[0];
      desc = desc || input.slice(0, 200);
    }

    updateForm({ url, name, description: desc });

    // If we have a url, try to auto test/discover (without secret)
    if (url) {
      await runTest(url, "none", "");
    }

    toast({ title: "Auto-filled", description: "Review and fill the API key / secret if needed." });
  };

  const runTest = async (testUrl?: string, testAuth?: string, testSecret?: string) => {
    const u = testUrl || form.url;
    if (!u) {
      toast({ title: "URL required for test", variant: "destructive" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const body: any = { url: u, authType: testAuth || form.authType };
      if (testSecret) body.secret = testSecret;
      const res = await fetch("/api/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      const msg = json.message || (json.ok ? "Connected" : "Failed");
      setTestResult(msg);
      if (json.tools && json.tools.length) {
        // Could store in description or later toolSchema
        updateForm({ description: form.description || `Discovered ${json.tools.length} tools` });
      }
      if (json.ok) {
        toast({ title: "Connection successful", description: msg });
      } else {
        toast({ title: "Test result", description: msg, variant: "destructive" });
      }
    } catch (e: any) {
      const msg = e?.message || "Test failed";
      setTestResult(msg);
      toast({ title: "Test failed", description: msg, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (alsoAttach = false) => {
    if (!form.url || !form.name) {
      toast({ title: "Name and URL are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        url: form.url,
        transport: form.transport,
        authType: form.authType,
        description: form.description,
        projectId: null,
      };
      if (form.secret) payload.secret = form.secret;

      const method = form.id ? "PUT" : "POST";
      const body = form.id ? { id: form.id, ...payload } : payload;

      const res = await fetch("/api/mcp", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save MCP server");
      }

      const data = await res.json();
      const savedServer = data.server;

      toast({ title: form.id ? "MCP server updated" : "MCP server connected" });

      onSaved?.(savedServer);

      if (alsoAttach && onAttachToGeneration) {
        onAttachToGeneration(savedServer);
      }

      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!form.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title || (isEdit ? "Edit MCP Server" : "Connect MCP Server")}</DialogTitle>
          <DialogDescription>
            Provide URL or paste MCP documentation/info. We will try to auto-fill. Secret / key is entered manually.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4 max-h-[70vh] overflow-auto">
          {/* Smart paste / URL field */}
          <div>
            <Label className="text-xs">URL or pasted MCP info</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={pasteInput}
                onChange={(e) => {
                  setPasteInput(e.target.value);
                  // live try to fill url
                  if (e.target.value.startsWith("http")) {
                    updateForm({ url: e.target.value });
                  }
                }}
                onPaste={(e) => {
                  // allow paste to trigger fill shortly after
                  setTimeout(handleSmartFill, 50);
                }}
                placeholder="https://... or paste description / docs here"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleSmartFill} disabled={!pasteInput.trim()}>
                <Wand2 className="size-4 mr-1" /> Auto-fill
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="My Postgres MCP" />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => updateForm({ url: e.target.value })} placeholder="http://localhost:3001 or https://..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Transport</Label>
              <Select value={form.transport} onValueChange={(v) => updateForm({ transport: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                  <SelectItem value="stdio">stdio (advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auth Type</Label>
              <Select value={form.authType} onValueChange={(v) => updateForm({ authType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="header">Custom Header</SelectItem>
                  <SelectItem value="token">X-Access-Token</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>API Key / Secret <span className="text-xs text-muted-foreground">(manual)</span></Label>
            <Input
              type="password"
              value={form.secret}
              onChange={(e) => updateForm({ secret: e.target.value })}
              placeholder="sk-... or token (leave blank if none)"
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground mt-1">This is encrypted server-side and never stored in the generated app.</p>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => updateForm({ description: e.target.value })} rows={2} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={(v) => updateForm({ enabled: v })} />
              <Label className="text-sm">Enabled</Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runTest()}
                disabled={!form.url || testing}
              >
                {testing ? <Loader2 className="size-4 mr-1 animate-spin" /> : <TestTube2 className="size-4 mr-1" />}
                Test connection
              </Button>
              {testResult && <span className="text-xs self-center text-muted-foreground max-w-[160px] truncate">{testResult}</span>}
            </div>
          </div>
        </div>

        <div className="border-t p-4 flex flex-col sm:flex-row gap-2 justify-end bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => handleSave(false)} disabled={loading}>
            {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            {isEdit ? "Save changes" : "Save MCP Server"}
          </Button>
          {!isEdit && onAttachToGeneration && (
            <Button onClick={() => handleSave(true)} disabled={loading} variant="default">
              Save &amp; Use for this build
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
