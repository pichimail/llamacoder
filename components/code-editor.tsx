"use client";

import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

export default function CodeEditor({
  path,
  value,
  onChange,
  onEditorReady,
}: {
  path: string;
  value: string;
  onChange: (v: string) => void;
  onEditorReady?: (api: { undo: () => void; redo: () => void }) => void;
}) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current && onEditorReady) {
      onEditorReady({
        undo: () => editorRef.current?.trigger("toolbar", "undo", null),
        redo: () => editorRef.current?.trigger("toolbar", "redo", null),
      });
    }
  });

  return (
    <Editor
      height="100%"
      path={path}
      language={getMonacoLanguage(path.split(".").pop() || "tsx")}
      value={value}
      theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
      onChange={(v) => onChange(v ?? "")}
      onMount={(editor) => {
        editorRef.current = editor;
        onEditorReady?.({
          undo: () => editor.trigger("toolbar", "undo", null),
          redo: () => editor.trigger("toolbar", "redo", null),
        });
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
        renderLineHighlight: "none",
        tabSize: 2,
        wordWrap: "on",
        smoothScrolling: true,
      }}
    />
  );
}
