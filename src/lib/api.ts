import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * Shared-tablet actor assertion, from /floor/identify. Kept in sessionStorage
 * only: the next person picking up the tablet must never inherit it across a
 * browser restart, and "hand over" clears it explicitly.
 */
const ACTOR_KEY = "akira.actor";

export interface StoredActor {
  token: string;
  profile_id: string;
  full_name: string;
  role: string;
  expires_at: number;
}

export function getActor(): StoredActor | null {
  try {
    const raw = sessionStorage.getItem(ACTOR_KEY);
    if (!raw) return null;
    const actor = JSON.parse(raw) as StoredActor;
    if (actor.expires_at * 1000 < Date.now()) {
      sessionStorage.removeItem(ACTOR_KEY);
      return null;
    }
    return actor;
  } catch {
    return null;
  }
}

export function setActor(actor: StoredActor | null): void {
  try {
    if (actor) sessionStorage.setItem(ACTOR_KEY, JSON.stringify(actor));
    else sessionStorage.removeItem(ACTOR_KEY);
  } catch {
    // Storage unavailable (private mode); the actor lives in memory via state.
  }
  window.dispatchEvent(new Event("akira:actor-changed"));
}

/**
 * The organisation the platform admin has opened (D35). Written by
 * AuthProvider, read here so every request made inside that organisation
 * carries it. sessionStorage, like the actor: a browser restart drops back to
 * the platform view instead of quietly reopening a customer's data.
 */
export const PLATFORM_ORGANISATION_KEY = "akira.platformOrganisation";

/** About the platform login itself. The API ignores the header on these, and
 * sending it anyway would only make the platform's own requests read oddly in
 * a log. */
const PLATFORM_OWN_PREFIXES = ["/platform", "/users/me", "/healthz", "/readyz"];

export function organisationHeaderFor(path: string): Record<string, string> {
  if (PLATFORM_OWN_PREFIXES.some((prefix) => path.startsWith(prefix))) return {};
  try {
    const raw = sessionStorage.getItem(PLATFORM_ORGANISATION_KEY);
    if (!raw) return {};
    const { id } = JSON.parse(raw) as { id?: unknown };
    return typeof id === "string" && id ? { "X-Organisation": id } : {};
  } catch {
    return {};
  }
}

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

  /** Signed in, but this login must verify a second factor first (D33). */
  get isMfaRequired(): boolean {
    return this.problem.type.endsWith("/mfa-required");
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
  /**
   * Send `body` as-is instead of JSON. For FormData, where the browser must
   * set its own Content-Type — it carries the multipart boundary, and naming
   * the type ourselves would produce a request the server cannot split.
   */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, retryOnUnauthorized = true, raw = false, headers, ...rest } = options;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(body === undefined || raw ? {} : { "Content-Type": "application/json" }),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(getActor() ? { "X-Actor-Token": getActor()!.token } : {}),
      ...organisationHeaderFor(path),
      ...headers,
    },
    ...(body === undefined ? {} : { body: raw ? (body as BodyInit) : JSON.stringify(body) }),
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
  /** Multipart, for file uploads. The browser sets the boundary. */
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body, raw: true }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
