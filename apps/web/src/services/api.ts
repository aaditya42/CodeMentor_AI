import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);

// --- Auth Service ---
export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data.data;
  },
  register: async (email: string, username: string, password: string) => {
    const { data } = await api.post('/auth/register', { email, username, password });
    return data.data;
  },
  me: async () => {
    const { data } = await api.get('/auth/me');
    return data.data;
  },
};

// --- Problems Service ---
export const problemsService = {
  list: async (page = 1, limit = 20, difficulty?: string, topic?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (difficulty) params.difficulty = difficulty;
    if (topic) params.topic = topic;
    const { data } = await api.get('/problems', { params });
    return data;
  },
  get: async (slug: string) => {
    const { data } = await api.get(`/problems/${slug}`);
    return data.data;
  },
};

// --- Hints Service ---
export const hintsService = {
  generate: async (params: {
    problemId: string;
    code: string;
    language: string;
    conversationId?: string;
    requestedLevel?: number;
    userMessage?: string;
  }) => {
    const { data } = await api.post('/hints/generate', params);
    return data.data;
  },

  streamHint: (params: {
    problemId: string;
    code: string;
    language: string;
    conversationId?: string;
    requestedLevel?: number;
    userMessage?: string;
  }): EventSource => {
    const token = useAuthStore.getState().accessToken;
    const queryParams = new URLSearchParams({
      ...params,
      requestedLevel: String(params.requestedLevel || 1),
      token: token || '',
    });
    return new EventSource(`${API_BASE}/hints/stream?${queryParams}`);
  },
};

// --- Execution Service ---
export const executionService = {
  run: async (code: string, language: string, testCases: Array<{ input: string; expected: string }>) => {
    const { data } = await api.post('/execute/run', { code, language, testCases });
    return data.data;
  },
  submit: async (code: string, language: string, problemId: string) => {
    const { data } = await api.post('/execute/submit', { code, language, problemId });
    return data.data;
  },
  getResult: async (submissionId: string) => {
    const { data } = await api.get(`/execute/${submissionId}`);
    return data.data;
  },
};

// --- Analytics Service ---
export const analyticsService = {
  getUserAnalytics: async () => {
    const { data } = await api.get('/analytics/user');
    return data.data;
  },
};
