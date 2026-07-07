"use client";

/**
 * MCP Servers Chooser (modeled directly after AIIntegrationChooser).
 * Shown when the prompt implies need for external tools / context / MCP.
 * Lets the user pick from their saved MCP servers (or skip).
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plug, Server, SkipForward, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { SelectedMcpServer } from "@/lib/mcp";

export interface McpChooserProps {
  chatId: string;
  detectedNeeds: string[];
  availableServers: Array<{
    id: string;
    name: string;
    url: string;
    hasSecret?: boolean;
  }>;
  onSelect: (selected: SelectedMcpServer[]) => void;
  onDismiss?: () => void;
}

export function McpChooser({ chatId, detectedNeeds, availableServers, onSelect }: McpChooserProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const patchChat = useCallback(async (servers: SelectedMcpServer[]) => {
    await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mcpServers: servers }),
    }).catch(() => undefined);
  }, [chatId]);

  const handleSelect = (servers: SelectedMcpServer[]) => {
    startTransition(async () => {
      await patchChat(servers);
      onSelect(servers);
    });
  };

  const toggle = (id: string, name: string, url: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const confirmSelection = () => {
    const chosen: SelectedMcpServer[] = availableServers
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name, url: s.url }));
    handleSelect(chosen);
  };

  const skip = () => {
    handleSelect([]);
  };

  return (
    <Card className="mx-auto w-full max-w-2xl rounded-2xl border-primary/20 bg-card/95 shadow-lg backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="size-5 text-primary" />
          External Tools / MCP Servers Detected
        </CardTitle>
        <CardDescription className="text-sm">
          Your app needs real data or external capabilities. Attach MCP servers?
        </CardDescription>
        {detectedNeeds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {detectedNeeds.map((need) => (
              <Badge key={need} variant="outline" className="rounded-full px-2 py-0 text-[10px]">
                {need}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="grid gap-3">
        {availableServers.length > 0 ? (
          <div className="space-y-2">
            {availableServers.map((srv) => {
              const checked = selectedIds.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggle(srv.id, srv.name, srv.url)}
                  className={`w-full text-left rounded-xl border p-3 transition ${checked ? "border-primary/60 bg-primary/5" : "border-border/70 hover:bg-muted/40"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Plug className="size-4" /> {srv.name}
                        {srv.hasSecret && <Badge variant="secondary" className="text-[9px]">Auth</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{srv.url}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{checked ? "✓ Selected" : "Click to attach"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No MCP servers saved yet. You can add them later in settings or skip for now.
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button
            onClick={confirmSelection}
            disabled={isPending || selectedIds.length === 0}
            className="flex-1"
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Zap className="mr-2 size-4" />}
            Attach {selectedIds.length} server{selectedIds.length === 1 ? "" : "s"} &amp; continue
          </Button>

          <Button
            variant="outline"
            onClick={skip}
            disabled={isPending}
            className="flex-1"
          >
            <SkipForward className="mr-2 size-4" /> Skip MCP for now (stubs)
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Selected servers will be injected into the generated app with a proper client + examples.
        </p>
      </CardContent>
    </Card>
  );
}
