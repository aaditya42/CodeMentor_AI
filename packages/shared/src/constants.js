// ============================================
// Shared Constants — CodeMentor AI
// ============================================
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
export const LANGUAGES = ['PYTHON', 'CPP', 'JAVA', 'JAVASCRIPT'];
export const LANGUAGE_DISPLAY = {
    PYTHON: 'Python',
    CPP: 'C++',
    JAVA: 'Java',
    JAVASCRIPT: 'JavaScript',
};
export const LANGUAGE_MONACO_MAP = {
    PYTHON: 'python',
    CPP: 'cpp',
    JAVA: 'java',
    JAVASCRIPT: 'javascript',
};
export const TOPICS = [
    'Arrays',
    'Strings',
    'Hash Table',
    'Dynamic Programming',
    'Math',
    'Sorting',
    'Greedy',
    'Binary Search',
    'Trees',
    'Graphs',
    'Stack',
    'Queue',
    'Heap',
    'Linked List',
    'Backtracking',
    'Sliding Window',
    'Two Pointers',
    'Bit Manipulation',
    'Divide and Conquer',
    'Union Find',
    'Trie',
    'Recursion',
];
export const HINT_LEVEL_DESCRIPTIONS = {
    1: 'Conceptual Guidance — High-level thinking direction',
    2: 'Algorithmic Direction — Specific approach suggestions',
    3: 'Partial Pseudocode — Step-by-step logic outline',
    4: 'Optimization Guidance — Performance improvement strategies',
    5: 'Implementation Hints — Detailed code-level guidance',
};
export const DIFFICULTY_COLORS = {
    EASY: '#00b8a3',
    MEDIUM: '#ffc01e',
    HARD: '#ff375f',
};
export const API_ROUTES = {
    AUTH: {
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        REFRESH: '/api/auth/refresh',
        ME: '/api/auth/me',
    },
    PROBLEMS: {
        LIST: '/api/problems',
        GET: (slug) => `/api/problems/${slug}`,
        SEARCH: '/api/problems/search',
    },
    SUBMISSIONS: {
        CREATE: '/api/submissions',
        GET: (id) => `/api/submissions/${id}`,
        USER: '/api/submissions/mine',
    },
    HINTS: {
        GENERATE: '/api/hints/generate',
        HISTORY: (problemId) => `/api/hints/history/${problemId}`,
    },
    CONVERSATIONS: {
        GET: (problemId) => `/api/conversations/${problemId}`,
        MESSAGE: (id) => `/api/conversations/${id}/message`,
    },
    ANALYTICS: {
        USER: '/api/analytics/user',
        ADMIN: '/api/analytics/admin',
    },
};
//# sourceMappingURL=constants.js.map