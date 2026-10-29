import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorBody, ApiSuccess, Meta, PublicUser } from "@/types/api";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000/api";

const REFRESH_KEY = "refreshToken";

// ---- In-memory access token, persisted refresh token ----
let accessToken: string | null = null;
type SessionListener = (event: "cleared") => void;
const listeners = new Set<SessionListener>();

export const tokenStore = {
  getAccess: () => accessToken,
  setAccess: (t: string | null) => {
    accessToken = t;
  },
  getRefresh: (): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  setRefresh: (t: string | null) => {
    if (typeof window === "undefined") return;
    if (t) window.localStorage.setItem(REFRESH_KEY, t);
    else window.localStorage.removeItem(REFRESH_KEY);
  },
  setTokens: (a: string, r: string) => {
    accessToken = a;
    tokenStore.setRefresh(r);
  },
  clear: () => {
    accessToken = null;
    tokenStore.setRefresh(null);
    listeners.forEach((l) => l("cleared"));
  },
  onCleared: (l: SessionListener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const http = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.set("Authorization", `Bearer ${accessToken}`);
  return config;
});

// ---- Errors ----
export class ApiError extends Error {
  code: string;
  status: number;
  details?: { field: string; message: string }[];
  requestId?: string;
  constructor(body: ApiErrorBody, status: number) {
    super(body.message || "Something went wrong");
    this.code = body.code || "UNKNOWN";
    this.status = status;
    this.details = Array.isArray(body.details) ? (body.details as ApiError["details"]) : undefined;
    this.requestId = body.requestId;
  }
}

// ---- Single-flight refresh ----
let refreshPromise: Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> | null =
  null;

export function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const stored = tokenStore.getRefresh();
  refreshPromise = (async () => {
    if (!stored) throw new ApiError({ success: false, message: "No session", code: "TOKEN_MISSING" }, 401);
    const res = await http.post<
      ApiSuccess<{ user: PublicUser; accessToken: string; refreshToken: string }>
    >("/auth/refresh", { refreshToken: stored });
    const d = res.data.data;
    tokenStore.setTokens(d.accessToken, d.refreshToken);
    return d;
  })().finally(() => {
    // keep the settled promise briefly so StrictMode double-mounts share one refresh
    setTimeout(() => {
      refreshPromise = null;
    }, 1000);
  });
  return refreshPromise;
}

const TOKEN_CODES = new Set(["TOKEN_EXPIRED", "TOKEN_INVALID", "TOKEN_MISSING"]);

// Endpoints that never carry an access token: a 401 from these is a real answer, not an expired session.
// (change-password, logout-all and /auth/me DO need a token, so they are allowed to refresh + retry.)
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/resend-verification",
];

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const skip = NO_REFRESH_PATHS.some((p) => original?.url?.startsWith(p));

    if (original && status === 401 && code && TOKEN_CODES.has(code) && !skip && !original._retry) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.set("Authorization", `Bearer ${accessToken}`);
        return http(original);
      } catch {
        // Clearing notifies AuthContext, which resets state; route guards then redirect to /login
        // without a full page reload (so unsaved form state elsewhere isn't thrown away).
        tokenStore.clear();
      }
    }
    return Promise.reject(toApiError(error));
  },
);

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const ax = error as AxiosError<ApiErrorBody>;
  if (ax?.response?.data && typeof ax.response.data === "object") {
    return new ApiError(ax.response.data, ax.response.status);
  }
  return new ApiError(
    {
      success: false,
      message: ax?.response
        ? `Request failed (${ax.response.status})`
        : "Can't reach the server. Check your connection and try again.",
      code: ax?.response ? "UNKNOWN" : "NETWORK_ERROR",
    },
    ax?.response?.status ?? 0,
  );
}

// ---- Helpers ----
export async function get<T>(url: string, params?: object) {
  const res = await http.get<ApiSuccess<T>>(url, { params: clean(params) });
  return res.data.data;
}
export async function getList<T>(url: string, params?: object) {
  const res = await http.get<ApiSuccess<T[]>>(url, { params: clean(params) });
  return { data: res.data.data, meta: res.data.meta as Meta };
}
export async function post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
  const res = await http.post<ApiSuccess<T>>(url, body, config);
  return res.data.data;
}
export async function put<T>(url: string, body?: unknown) {
  const res = await http.put<ApiSuccess<T>>(url, body);
  return res.data.data;
}
export async function patch<T>(url: string, body?: unknown) {
  const res = await http.patch<ApiSuccess<T>>(url, body);
  return res.data.data;
}
export async function del<T>(url: string) {
  const res = await http.delete<ApiSuccess<T>>(url);
  return res.data.data;
}
export async function upload<T>(url: string, file: File) {
  const fd = new FormData();
  fd.append("image", file);
  return post<T>(url, fd);
}

function clean(params?: object) {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}