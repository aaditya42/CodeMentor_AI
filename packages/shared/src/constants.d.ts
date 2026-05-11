export declare const DIFFICULTIES: readonly ["EASY", "MEDIUM", "HARD"];
export declare const LANGUAGES: readonly ["PYTHON", "CPP", "JAVA", "JAVASCRIPT"];
export declare const LANGUAGE_DISPLAY: Record<string, string>;
export declare const LANGUAGE_MONACO_MAP: Record<string, string>;
export declare const TOPICS: readonly ["Arrays", "Strings", "Hash Table", "Dynamic Programming", "Math", "Sorting", "Greedy", "Binary Search", "Trees", "Graphs", "Stack", "Queue", "Heap", "Linked List", "Backtracking", "Sliding Window", "Two Pointers", "Bit Manipulation", "Divide and Conquer", "Union Find", "Trie", "Recursion"];
export declare const HINT_LEVEL_DESCRIPTIONS: Record<number, string>;
export declare const DIFFICULTY_COLORS: Record<string, string>;
export declare const API_ROUTES: {
    readonly AUTH: {
        readonly REGISTER: "/api/auth/register";
        readonly LOGIN: "/api/auth/login";
        readonly REFRESH: "/api/auth/refresh";
        readonly ME: "/api/auth/me";
    };
    readonly PROBLEMS: {
        readonly LIST: "/api/problems";
        readonly GET: (slug: string) => string;
        readonly SEARCH: "/api/problems/search";
    };
    readonly SUBMISSIONS: {
        readonly CREATE: "/api/submissions";
        readonly GET: (id: string) => string;
        readonly USER: "/api/submissions/mine";
    };
    readonly HINTS: {
        readonly GENERATE: "/api/hints/generate";
        readonly HISTORY: (problemId: string) => string;
    };
    readonly CONVERSATIONS: {
        readonly GET: (problemId: string) => string;
        readonly MESSAGE: (id: string) => string;
    };
    readonly ANALYTICS: {
        readonly USER: "/api/analytics/user";
        readonly ADMIN: "/api/analytics/admin";
    };
};
