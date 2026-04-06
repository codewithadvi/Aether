import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  total_papers_read: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      setToken: (token: string) => {
        localStorage.setItem('auth_token', token);
        set({ token });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, token } = data.data;
          localStorage.setItem('auth_token', token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { email, password, name });
          const { user, token } = data.data;
          localStorage.setItem('auth_token', token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null });
        window.location.href = '/login';
      },

      fetchMe: async () => {
        const token = get().token || localStorage.getItem('auth_token');
        if (!token) return;
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data, token });
        } catch {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null });
        }
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ token: s.token }) }
  )
);
