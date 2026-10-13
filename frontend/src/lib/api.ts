import type {
  DiscussionCreated,
  LeadDetail,
  LeadFilters,
  LeadList,
  LeadStatus,
  NewDiscussion,
  NewLead,
} from "./types";

/** An HTTP error with the API's message (FastAPI's `detail`) ready to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Same-origin: next.config.ts proxies /api/* to the FastAPI server, so there is no CORS to configure.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    let message =
      response.status >= 500 ? "The server had a problem. Please try again." : `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") message = body.detail;
    } catch {
      // not JSON (e.g. the proxy could not reach the API) — keep the generic message
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  listLeads(filters: LeadFilters) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    const query = params.toString();
    return request<LeadList>(`/leads${query ? `?${query}` : ""}`);
  },
  getLead: (id: number) => request<LeadDetail>(`/leads/${id}`),
  createLead: (data: NewLead) => request<LeadDetail>("/leads", json("POST", data)),
  updateLead: (id: number, data: { status?: LeadStatus; follow_up_at?: string | null }) =>
    request<LeadDetail>(`/leads/${id}`, json("PATCH", data)),
  addDiscussion: (id: number, data: NewDiscussion) =>
    request<DiscussionCreated>(`/leads/${id}/discussions`, json("POST", data)),
};
