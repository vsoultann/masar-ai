"use client";

import type { Lang } from "@/lib/types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const TOKEN_KEY = "masar.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Private browsing can make localStorage throw rather than return null.
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore: the app still works for the current page load */
  }
}

/** A failed request, carrying enough for the UI to show a translated message. */
export class ApiError extends Error {
  status: number;
  code: string;
  messageEn: string;
  messageAr: string;
  fields: { field: string; message_en: string; message_ar: string }[];

  constructor(
    status: number,
    code: string,
    messageEn: string,
    messageAr: string,
    fields: { field: string; message_en: string; message_ar: string }[] = [],
  ) {
    super(messageEn);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.messageEn = messageEn;
    this.messageAr = messageAr;
    this.fields = fields;
  }

  localised(lang: Lang): string {
    return lang === "ar" ? this.messageAr : this.messageEn;
  }
}

type Body = Record<string, unknown> | undefined;

async function parseError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    /* a non-JSON error body, e.g. a proxy timeout page */
  }

  const record = (payload ?? {}) as Record<string, unknown>;
  // FastAPI wraps HTTPException bodies in "detail"; our own handlers put the
  // bilingual pair at the top level. Accept both shapes.
  const detail = (record.detail ?? record) as Record<string, unknown>;

  if (typeof detail === "object" && detail !== null && "message_en" in detail) {
    return new ApiError(
      response.status,
      String(detail.code ?? "error"),
      String(detail.message_en),
      String(detail.message_ar ?? detail.message_en),
      (record.details as ApiError["fields"]) ?? [],
    );
  }

  const fallback: Record<number, [string, string]> = {
    401: ["Please sign in again.", "يرجى تسجيل الدخول مجدداً."],
    403: ["You do not have permission to do that.", "لا تملك صلاحية للقيام بذلك."],
    404: ["We could not find that.", "لم نتمكّن من العثور على ذلك."],
    409: ["That conflicts with something that already exists.", "هناك تعارض مع عنصر موجود مسبقاً."],
    422: ["Please check the highlighted fields.", "يرجى مراجعة الحقول المحدّدة."],
  };
  const [en, ar] = fallback[response.status] ?? [
    "The server had a problem. Please try again.",
    "واجه الخادم مشكلة. يرجى المحاولة مجدداً.",
  ];
  return new ApiError(response.status, "http_error", en, ar);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: Body; auth?: boolean; raw?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "network",
      "Could not reach the server. Check that the API is running.",
      "تعذّر الوصول إلى الخادم. تأكّد من تشغيل الواجهة البرمجية.",
    );
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { auth }),
  post: <T>(path: string, body?: Body, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: Body, auth = true) =>
    request<T>(path, { method: "PUT", body, auth }),
  del: <T>(path: string, auth = true) => request<T>(path, { method: "DELETE", auth }),

  /** Downloads the PDF report and hands the browser a blob to save. */
  async downloadReport(lang: Lang): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/api/report/pdf?lang=${lang}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw await parseError(response);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `masar-ai-career-report-${lang}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
