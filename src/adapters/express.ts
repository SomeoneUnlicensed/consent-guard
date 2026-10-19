import { createGuard, type GuardConfig } from '../index.js';

type Middleware = (req: any, res: any, next: any) => void;

export function guard(partial: Partial<GuardConfig> & { siteName: string }): Middleware {
  const g = createGuard(partial);
  return (req, res, next) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const outcome = g.handle({
      method: req.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams.toString(),
      headers: req.headers,
      ip: req.ip ?? req.socket?.remoteAddress,
      acceptLanguage: req.headers['accept-language'],
    });

    for (const [k, v] of Object.entries(outcome.headers)) res.setHeader(k, v);

    if (outcome.effective && (outcome.mode === 'block' || outcome.verdict === 'blocked')) {
      res.statusCode = outcome.status;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(outcome.noticeHtml);
      return;
    }
    if (outcome.effective && outcome.mode === 'notice') {
      res.setHeader('x-consent-guard', outcome.requestId);
      const originalEnd = res.end.bind(res);
      const originalWrite = res.write.bind(res);
      let buffer = '';
      let buffered = false;
      res.write = (chunk: unknown, ...rest: unknown[]) => {
        buffer += chunk;
        buffered = true;
        if (typeof rest[0] === 'function') (rest[0] as () => void)();
        return true;
      };
      res.end = (chunk?: unknown, ...rest: unknown[]) => {
        if (chunk) buffer += chunk;
        if (buffered && /<\/head>/i.test(buffer)) {
          const inject = `<meta name="consent-guard" content="${outcome.requestId}"><meta name="ai-notice" content="Access not authorized: the site owner has not granted permission to automated agents.">`;
          buffer = buffer.replace(/<\/head>/i, `${inject}</head>`);
        }
        originalEnd(buffer, ...rest);
      };
    }
    next();
  };
}
