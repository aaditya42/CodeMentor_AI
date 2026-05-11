"use client";

import { useCallback, useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useWorkspaceStore, Language } from "@/stores/workspace-store";

const LANGUAGE_MAP: Record<Language, string> = {
  PYTHON: "python",
  CPP: "cpp",
  JAVA: "java",
  JAVASCRIPT: "javascript",
};

interface CodeEditorProps {
  starterCode: Record<string, string>;
}

export function CodeEditor({ starterCode }: CodeEditorProps) {
  const { code, setCode, language, setLanguage } = useWorkspaceStore();
  const editorRef = useRef<any>(null);
  const prevLangRef = useRef<Language>(language);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Keyboard shortcuts
    editor.addCommand(
      // Ctrl+Enter = Run
      2048 | 3, // KeyMod.CtrlCmd | KeyCode.Enter
      () => {
        const runBtn = document.querySelector('[data-run-button]') as HTMLButtonElement;
        runBtn?.click();
      }
    );
  };

  // Switch starter code when language changes
  useEffect(() => {
    if (language !== prevLangRef.current) {
      const starter = starterCode[language] || '';
      setCode(starter);
      prevLangRef.current = language;
    }
  }, [language, starterCode, setCode]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) setCode(value);
    },
    [setCode]
  );

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--card))]">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-1.5">
        <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
          {LANGUAGE_MAP[language]?.toUpperCase() || "CODE"}
        </span>
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <kbd className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-0.5 text-[10px]">Ctrl+Enter</kbd>
          <span>Run</span>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={LANGUAGE_MAP[language]}
          value={code}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "off",
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            lineNumbers: "on",
            glyphMargin: false,
            lineDecorationsWidth: 8,
            overviewRulerBorder: false,
          }}
        />
      </div>
    </div>
  );
}
