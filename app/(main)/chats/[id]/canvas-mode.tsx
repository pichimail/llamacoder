"use client";

import { useState } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Controls } from "@/components/ai-elements/controls";
import { Panel } from "@/components/ai-elements/panel";
import { Database, FileCode2, FolderTree, Layout, Settings } from "lucide-react";
import type { ArtifactFile } from "@/lib/artifact-analysis";
import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";

interface CanvasModeProps {
  files: ArtifactFile[];
  onRequestChange?: (description: string) => void;
  isStreaming?: boolean;
}

export function CanvasMode({ files, onRequestChange, isStreaming }: CanvasModeProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(() => generateNodesFromFiles(files));
  const [edges, setEdges] = useState<FlowEdge[]>(() => generateEdgesFromFiles(files));

  const handleNodeClick = (event: any, node: FlowNode) => {
    if (onRequestChange && node.data?.path) {
      onRequestChange(`Improve or edit the file at ${node.data.path} with better layout, accessibility and modern styling.`);
    }
  };

  return (
    <div className="relative h-full w-full bg-background">
      <Canvas 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={setNodes as any} 
        onEdgesChange={setEdges as any}
        onNodeClick={handleNodeClick}
      >
        <Controls />
        <Panel position="top-left">
          <div className="rounded-lg border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-sm max-w-[220px]">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Canvas / Visual Overview
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Nodes:</span>
                <span className="font-medium text-foreground">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Connections:</span>
                <span className="font-medium text-foreground">{edges.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Files:</span>
                <span className="font-medium text-foreground">{files.length}</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground">Click a node to request AI edit on that file.</div>
          </div>
        </Panel>
        <Panel position="bottom-right">
          <div className="text-[10px] bg-background/80 px-2 py-1 rounded border">Drag nodes • Click to edit via AI</div>
        </Panel>
      </Canvas>
    </div>
  );
}

// Helper functions
function generateNodesFromFiles(files: ArtifactFile[]): FlowNode[] {
  const nodes: FlowNode[] = [];
  const gridSize = 220;
  let x = 100;
  let y = 100;

  files.forEach((file, index) => {
    const nodeType = determineNodeType(file.path);
    
    nodes.push({
      id: `file-${index}`,
      type: "default",
      position: { x, y },
      data: {
        label: file.path.split("/").pop() || file.path,
        path: file.path,
        nodeType,
        icon: getNodeIcon(nodeType),
      },
    });

    x += gridSize;
    if (x > 800) {
      x = 100;
      y += gridSize;
    }
  });

  return nodes;
}

function generateEdgesFromFiles(files: ArtifactFile[]): FlowEdge[] {
  const edges: FlowEdge[] = [];
  
  // Simple heuristic: connect layout to pages, pages to components
  files.forEach((file, index) => {
    if (file.path.includes("layout")) {
      files.forEach((otherFile, otherIndex) => {
        if (otherFile.path.includes("page") && index !== otherIndex) {
          edges.push({
            id: `edge-${index}-${otherIndex}`,
            source: `file-${index}`,
            target: `file-${otherIndex}`,
            label: "renders",
          });
        }
      });
    }
  });

  return edges;
}

function determineNodeType(path: string): "file" | "component" | "route" | "api" | "config" {
  if (path.includes("layout")) return "route";
  if (path.includes("page")) return "route";
  if (path.includes("api")) return "api";
  if (path.match(/\.(json|config)/)) return "config";
  if (path.includes("components")) return "component";
  return "file";
}

function getNodeIcon(type: "file" | "component" | "route" | "api" | "config") {
  switch (type) {
    case "route":
      return <Layout className="size-4 text-emerald-400" />;
    case "component":
      return <FileCode2 className="size-4 text-blue-400" />;
    case "api":
      return <Database className="size-4 text-violet-400" />;
    case "config":
      return <Settings className="size-4 text-amber-400" />;
    default:
      return <FolderTree className="size-4 text-muted-foreground" />;
  }
}
