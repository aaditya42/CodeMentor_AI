export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Language = 'PYTHON' | 'CPP' | 'JAVA' | 'JAVASCRIPT';
export type SubmissionStatus = 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type HintLevel = 1 | 2 | 3 | 4 | 5;
export type Role = 'USER' | 'ADMIN';
export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: Role;
    createdAt: string;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    displayName?: string;
}
export interface Problem {
    id: string;
    title: string;
    slug: string;
    description: string;
    difficulty: Difficulty;
    topics: string[];
    companies: string[];
    constraints: string;
    examples: ProblemExample[];
    starterCode: Record<string, string>;
    createdAt: string;
}
export interface ProblemExample {
    input: string;
    output: string;
    explanation?: string;
}
export interface ProblemListItem {
    id: string;
    title: string;
    slug: string;
    difficulty: Difficulty;
    topics: string[];
    acceptanceRate?: number;
}
export interface TestCase {
    id: string;
    input: string;
    expected: string;
    isHidden: boolean;
}
export interface Submission {
    id: string;
    code: string;
    language: Language;
    status: SubmissionStatus;
    runtime: number | null;
    memory: number | null;
    astAnalysis: ASTAnalysis | null;
    complexityInfo: ComplexityAnalysis | null;
    userId: string;
    problemId: string;
    createdAt: string;
}
export interface SubmitCodeRequest {
    code: string;
    language: Language;
    problemId: string;
}
export interface ASTAnalysis {
    language: string;
    algorithmPattern: string;
    detectedPatterns: string[];
    estimatedTimeComplexity: string;
    estimatedSpaceComplexity: string;
    issues: ASTIssue[];
    optimizationSuggestions: OptimizationSuggestion[];
    recursionDetected: boolean;
    dpPotential: boolean;
    codeStructure: CodeStructure;
}
export interface ASTIssue {
    type: 'performance' | 'bug' | 'edge_case' | 'style';
    severity: 'info' | 'warning' | 'error';
    message: string;
    line?: number;
}
export interface OptimizationSuggestion {
    strategy: string;
    expectedComplexity: string;
    description: string;
}
export interface CodeStructure {
    functions: number;
    loops: number;
    nestedLoopDepth: number;
    conditionals: number;
    recursiveCalls: number;
    dataStructuresUsed: string[];
}
export interface ComplexityAnalysis {
    timeComplexity: string;
    spaceComplexity: string;
    isTLEProne: boolean;
    redundantComputations: string[];
    suggestions: ComplexitySuggestion[];
}
export interface ComplexitySuggestion {
    from: string;
    to: string;
    technique: string;
    description: string;
}
export interface HintRequest {
    problemId: string;
    code: string;
    language: Language;
    conversationId?: string;
    requestedLevel?: HintLevel;
}
export interface HintResponse {
    id: string;
    content: string;
    hintLevel: HintLevel;
    conversationId: string;
    metadata: {
        retrievalContext: string[];
        astUsed: boolean;
        complexityUsed: boolean;
    };
}
export interface Conversation {
    id: string;
    userId: string;
    problemId: string;
    messages: Message[];
    hintLevel: number;
    createdAt: string;
    updatedAt: string;
}
export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    hintLevel: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
export interface UserAnalytics {
    totalSubmissions: number;
    acceptedCount: number;
    hintsUsed: number;
    streakDays: number;
    topicBreakdown: Record<string, number>;
    difficultyBreakdown: Record<Difficulty, number>;
}
export interface HintEvaluation {
    id: string;
    hintId: string;
    relevanceScore: number;
    hallucination: boolean;
    solutionLeakage: boolean;
    responseLatencyMs: number;
    userRating: number | null;
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
export interface ApiError {
    success: false;
    error: string;
    statusCode: number;
    details?: Record<string, unknown>;
}
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface RetrievalResult {
    documentId: string;
    content: string;
    score: number;
    metadata: {
        type: 'problem' | 'editorial' | 'pattern' | 'mistake' | 'edge_case';
        difficulty?: Difficulty;
        topics?: string[];
    };
}
export type SSEEvent = {
    type: 'hint_start';
    conversationId: string;
    hintLevel: HintLevel;
} | {
    type: 'hint_chunk';
    content: string;
} | {
    type: 'hint_complete';
    hintId: string;
} | {
    type: 'analysis';
    data: ASTAnalysis;
} | {
    type: 'complexity';
    data: ComplexityAnalysis;
} | {
    type: 'error';
    message: string;
};
