import { create } from 'zustand';

export type Language = 'PYTHON' | 'CPP' | 'JAVA' | 'JAVASCRIPT';
export type HintLevel = 1 | 2 | 3 | 4 | 5;

interface ASTAnalysis {
  language: string;
  algorithmPattern: string;
  detectedPatterns: string[];
  estimatedTimeComplexity: string;
  estimatedSpaceComplexity: string;
  issues: Array<{ type: string; severity: string; message: string; line?: number }>;
  optimizationSuggestions: Array<{ strategy: string; expectedComplexity: string; description: string }>;
  recursionDetected: boolean;
  dpPotential: boolean;
  codeStructure: {
    functions: number; loops: number; nestedLoopDepth: number;
    conditionals: number; recursiveCalls: number; dataStructuresUsed: string[];
  };
}

interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  isTLEProne: boolean;
  redundantComputations: string[];
  suggestions: Array<{ from: string; to: string; technique: string; description: string }>;
}

interface HintMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hintLevel?: number;
  timestamp: number;
}

interface ExecutionResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'PENDING';
  stdout: string;
  stderr: string;
  compileOutput: string;
  time: string;
  memory: number;
  testCasesPassed?: number;
  totalTestCases?: number;
}

interface WorkspaceState {
  // Code
  code: string;
  language: Language;
  problemId: string | null;
  problemSlug: string | null;

  // AI Analysis
  astAnalysis: ASTAnalysis | null;
  complexityAnalysis: ComplexityAnalysis | null;

  // Hints
  hints: HintMessage[];
  currentHintLevel: HintLevel;
  isStreamingHint: boolean;
  streamingContent: string;
  conversationId: string | null;

  // Execution
  executionResult: ExecutionResult | null;
  isExecuting: boolean;
  activeConsoleTab: string;

  // UI state
  isHintSidebarOpen: boolean;

  // Actions
  setCode: (code: string) => void;
  setLanguage: (language: Language) => void;
  setProblem: (id: string, slug: string) => void;
  setASTAnalysis: (analysis: ASTAnalysis | null) => void;
  setComplexityAnalysis: (analysis: ComplexityAnalysis | null) => void;
  addHint: (hint: HintMessage) => void;
  setCurrentHintLevel: (level: HintLevel) => void;
  setIsStreamingHint: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setConversationId: (id: string | null) => void;
  setExecutionResult: (result: ExecutionResult | null) => void;
  setIsExecuting: (executing: boolean) => void;
  setActiveConsoleTab: (tab: string) => void;
  setIsHintSidebarOpen: (open: boolean) => void;
  resetWorkspace: () => void;
}

const initialState = {
  code: '',
  language: 'PYTHON' as Language,
  problemId: null,
  problemSlug: null,
  astAnalysis: null,
  complexityAnalysis: null,
  hints: [],
  currentHintLevel: 1 as HintLevel,
  isStreamingHint: false,
  streamingContent: '',
  conversationId: null,
  executionResult: null,
  isExecuting: false,
  activeConsoleTab: 'testcases',
  isHintSidebarOpen: true,
};

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  ...initialState,

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setProblem: (id, slug) => set({ problemId: id, problemSlug: slug }),
  setASTAnalysis: (astAnalysis) => set({ astAnalysis }),
  setComplexityAnalysis: (complexityAnalysis) => set({ complexityAnalysis }),
  addHint: (hint) => set((s) => ({ hints: [...s.hints, hint], currentHintLevel: Math.min((hint.hintLevel || s.currentHintLevel) + 1, 5) as HintLevel })),
  setCurrentHintLevel: (currentHintLevel) => set({ currentHintLevel }),
  setIsStreamingHint: (isStreamingHint) => set({ isStreamingHint }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingContent: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),
  setConversationId: (conversationId) => set({ conversationId }),
  setExecutionResult: (executionResult) => set({ executionResult }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setActiveConsoleTab: (activeConsoleTab) => set({ activeConsoleTab }),
  setIsHintSidebarOpen: (isHintSidebarOpen) => set({ isHintSidebarOpen }),
  resetWorkspace: () => set(initialState),
}));
