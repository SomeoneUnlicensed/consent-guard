import { createGuard, type GuardConfig } from '../index.js';

export interface NextMiddlewareEvent {
  headers: Headers;
  nextUrl: { pathname: string; search: string };
  url: string;
  method: string;
  ip?: string;
}

export type NextResponseLike = {
  status: number;
  headers: Headers;
  text(): Promise<string>;
};

export function guard(partial: Partial<GuardConfig> & { siteName: string }) {
  const g = createGuard(partial);
  return async function middleware(req: NextMiddlewareEvent): Promise<NextResponseLike | undefined> {
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const outcome = g.handle({
      method: req.method,
      path: req.nextUrl.pathname,
      query: req.nextUrl.search.replace(/^\?/, ''),
      headers,
      ip: req.ip,
      acceptLanguage: headers['accept-language'],
    });

    if (!outcome.effective) return undefined;

    const h = new Headers();
    for (const [k, v] of Object.entries(outcome.headers)) h.set(k, v);
    h.set('x-consent-guard', outcome.requestId);

    if (outcome.mode === 'block' || outcome.verdict === 'blocked') {
      return {
        status: outcome.status,
        headers: h,
        text: async () => outcome.noticeHtml ?? '',
      } as unknown as NextResponseLike;
    }
    return undefined;
  };
}
