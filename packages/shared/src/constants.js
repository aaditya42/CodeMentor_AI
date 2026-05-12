"use strict";
// ============================================
// Shared Constants — CodeMentor AI
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ROUTES = exports.DIFFICULTY_COLORS = exports.HINT_LEVEL_DESCRIPTIONS = exports.TOPICS = exports.LANGUAGE_MONACO_MAP = exports.LANGUAGE_DISPLAY = exports.LANGUAGES = exports.DIFFICULTIES = void 0;
exports.DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
exports.LANGUAGES = ['PYTHON', 'CPP', 'JAVA', 'JAVASCRIPT'];
exports.LANGUAGE_DISPLAY = {
    PYTHON: 'Python',
    CPP: 'C++',
    JAVA: 'Java',
    JAVASCRIPT: 'JavaScript',
};
exports.LANGUAGE_MONACO_MAP = {
    PYTHON: 'python',
    CPP: 'cpp',
    JAVA: 'java',
    JAVASCRIPT: 'javascript',
};
exports.TOPICS = [
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
exports.HINT_LEVEL_DESCRIPTIONS = {
    1: 'Conceptual Guidance — High-level thinking direction',
    2: 'Algorithmic Direction — Specific approach suggestions',
    3: 'Partial Pseudocode — Step-by-step logic outline',
    4: 'Optimization Guidance — Performance improvement strategies',
    5: 'Implementation Hints — Detailed code-level guidance',
};
exports.DIFFICULTY_COLORS = {
    EASY: '#00b8a3',
    MEDIUM: '#ffc01e',
    HARD: '#ff375f',
};
exports.API_ROUTES = {
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