// The axios instance already unwraps `response.data`, so a call returns the server's JSON body
// (`{ success, data }` for most routes). These helpers cope with both a wrapped and a bare body.
export const unwrapData = <T = any>(body: any): T => (body && typeof body === "object" && "data" in body ? body.data : body) as T;

export const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.response?.data?.error || (typeof err?.message === "string" ? err.message : "") || fallback;
