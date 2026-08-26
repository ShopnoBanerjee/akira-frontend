import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** RFC 7807 problem+json, as the API emits it. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.problem = problem;
  }

  /** The account exists but an admin has not activated it yet. */
  get isPendingActivation(): boolean {
    return this.problem.type.endsWith("/pending-activation");
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

async function toProblem(response: Response): Promise<Problem> {
  try {
    const body = (await response.json()) as Partial<Problem>;
    if (typeof body?.status === "number" && typeof body?.title === "string") {
      return body as Problem;
    }
  } catch {
    // Fall through: a non-JSON error body is still an error.
  }
  return {
    type: "about:blank",
    title: response.statusText || "Request failed",
    status: response.status,
    detail:
      response.status >= 500
        ? "The server had a problem. Try again in a moment."
        : "That request could not be completed.",
  };
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Internal: prevents an endless refresh loop on a 401. */
  retryOnUnauthorized?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, retryOnUnauthorized = true, headers, ...rest } = options;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 401 && retryOnUnauthorized) {
    // The token may simply have expired mid-flight. Refresh once, then retry.
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      return request<T>(path, { ...options, retryOnUnauthorized: false });
    }
    await supabase.auth.signOut();
  }

  if (!response.ok) {
    throw new ApiError(await toProblem(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
