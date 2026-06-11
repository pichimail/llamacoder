"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

export default function SyntaxHighlighter({
  files,
  activePath,
  disableSelection,
  isStreaming,
}: {
  files: Array<{ path: string; content: string; language: string }>;
  activePath?: string;
  disableSelection?: boolean;
  isStreaming?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [activeFile, setActiveFile] = useState(0);
  const editorRef = useRef<any>(null);

  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "github-light-default";

  // Update monaco theme live when user toggles without full remount
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && typeof editor._themeService?.setTheme === "function") {
      editor._themeService.setTheme(monacoTheme);
    } else if (editor?.updateOptions) {
      // Fallback: some versions expose setTheme on the standalone
      try {
        (editor as any).setTheme?.(monacoTheme);
      } catch {}
    }
  }, [monacoTheme]);

  // Keep the active file synced when an external activePath is provided
  useEffect(() => {
    if (!activePath) return;
    const idx = files.findIndex((f) => f.path === activePath);
    if (idx !== -1 && idx !== activeFile) {
      setActiveFile(idx);
    }
  }, [activePath, files, activeFile]);

  const file = files[activeFile];
  const monacoLanguage = useMemo(
    () => (file ? getMonacoLanguage(file.language) : "plaintext"),
    [file?.language],
  );

  // Auto-scroll the editor to bottom when streaming updates arrive
  useEffect(() => {
    if (!isStreaming || !editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel?.();
    const lineCount = model?.getLineCount?.() || 1;
    // Reveal last line and ensure scroll position at bottom
    editor.revealLine?.(lineCount);
    const scrollHeight = editor.getScrollHeight?.();
    if (typeof scrollHeight === "number") {
      editor.setScrollTop?.(scrollHeight);
    }
  }, [file?.content, activeFile, isStreaming]);

  if (files.length === 0) {
    return <div className="p-4 text-gray-600 dark:text-gray-400" role="status">No files to display</div>;
  }

  // Group files by directory structure
  const fileTree = buildFileTree(files);

  return (
    <div className="flex h-full flex-col md:flex-row">
      {files.length > 1 && (
        <>
          {/* Mobile: File tree above code editor */}
          <div className="block border-b border-gray-300 bg-gray-100 md:hidden dark:border-gray-700 dark:bg-zinc-900" role="region" aria-label="File list">
            <div className="border-b border-gray-300 p-2 text-sm font-medium text-gray-800 dark:border-gray-700 dark:text-gray-200">
              Files ({files.length})
            </div>
            <div className="max-h-32 overflow-y-auto">
              <FileTree
                tree={fileTree}
                activeFile={files[activeFile]?.path}
                onFileSelect={(path) => {
                  if (disableSelection) return;
                  const index = files.findIndex((f) => f.path === path);
                  if (index !== -1) setActiveFile(index);
                }}
              />
            </div>
          </div>

          {/* Desktop: File tree as sidebar */}
          <div
            className={`hidden w-fit max-w-48 border-r border-gray-300 bg-gray-100 md:block md:w-64 dark:border-gray-700 dark:bg-zinc-900 ${isStreaming ? "pointer-events-none opacity-60" : ""}`}
            role="tree"
            aria-label="File explorer"
          >
            <div className="border-b border-gray-300 p-2 text-sm font-medium text-gray-800 dark:border-gray-700 dark:text-gray-200">
              Files ({files.length})
            </div>
            <div className="overflow-y-auto">
              <FileTree
                tree={fileTree}
                activeFile={files[activeFile]?.path}
                onFileSelect={(path) => {
                  if (disableSelection) return;
                  const index = files.findIndex((f) => f.path === path);
                  if (index !== -1) setActiveFile(index);
                }}
              />
            </div>
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-zinc-900 dark:text-gray-300" aria-live="polite">
          {file?.path}
        </div>
        <div className="flex-1">
          <div className="relative h-full">
            <Editor
              value={file?.content || ""}
              language={monacoLanguage}
              theme={monacoTheme}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                scrollbar: isStreaming
                  ? { vertical: "hidden", horizontal: "hidden" }
                  : { vertical: "auto", horizontal: "auto" },
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                if (isStreaming) {
                  const model = editor.getModel?.();
                  const lineCount = model?.getLineCount?.() || 1;
                  editor.revealLine?.(lineCount);
                  const scrollHeight = editor.getScrollHeight?.();
                  if (typeof scrollHeight === "number") {
                    editor.setScrollTop?.(scrollHeight);
                  }
                }
              }}
              height="82vh"
            />
            {isStreaming && (
              <>
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
                  onWheel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseMove={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onScroll={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    // Prevent arrow keys, page up/down, home/end from scrolling
                    if (
                      [
                        "ArrowUp",
                        "ArrowDown",
                        "ArrowLeft",
                        "ArrowRight",
                        "PageUp",
                        "PageDown",
                        "Home",
                        "End",
                      ].includes(e.key)
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  tabIndex={-1}
                  style={{ pointerEvents: "all" }}
                />
                <div className="absolute bottom-4 left-0 right-0 z-20 pb-4 pt-8">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 shadow-sm dark:bg-blue-900/70 dark:text-blue-200" role="status" aria-live="polite">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
                      </div>
                      <span>
                        AI is writing your{" "}
                        {activePath ? activePath.split("/").pop() : "code"}...
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFileTree(
  files: Array<{ path: string; content: string; language: string }>,
) {
  const tree: any = {};

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] =
          index === parts.length - 1 ? { ...file, isFile: true } : {};
      }
      current = current[part];
    });
  });

  return tree;
}

function FileTree({
  tree,
  activeFile,
  onFileSelect,
  prefix = "",
}: {
  tree: any;
  activeFile: string;
  onFileSelect: (path: string) => void;
  prefix?: string;
}) {
  return (
    <>
      {Object.entries(tree).map(([name, node]: [string, any]) => {
        const fullPath = prefix ? `${prefix}/${name}` : name;
        const isActive = fullPath === activeFile;

        if (node.isFile) {
          return (
            <div
              key={name}
              className={`cursor-pointer px-2 py-1 text-sm hover:bg-gray-200 focus:bg-gray-200 focus:outline-none dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 ${
                isActive ? "bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200 font-medium" : "text-gray-800 dark:text-gray-200"
              }`}
              role="treeitem"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => onFileSelect(fullPath)}
            >
              📄 {name}
            </div>
          );
        } else {
          return (
            <div key={name}>
              <div className="px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300" aria-hidden="true">
                📁 {name}
              </div>
              <div className="ml-4">
                <FileTree
                  tree={node}
                  activeFile={activeFile}
                  onFileSelect={onFileSelect}
                  prefix={fullPath}
                />
              </div>
            </div>
          );
        }
      })}
    </>
  );
}
