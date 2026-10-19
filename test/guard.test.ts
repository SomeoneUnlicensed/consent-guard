import { describe, it, expect } from 'vitest';
import { createGuard } from '../src/index.js';

const browserUA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function req(over: Record<string, unknown>) {
  return {
    method: 'GET',
    path: '/',
    query: '',
    headers: { 'user-agent': browserUA, 'sec-fetch-dest': 'document', 'accept-language': 'ru-RU' },
    ...over,
  } as any;
}

describe('createGuard', () => {
  it('passes normal traffic in notice mode', () => {
    const g = createGuard({ siteName: 't', mode: 'notice' });
    const out = g.handle(req({}));
    expect(out.effective).toBe(false);
    expect(out.status).toBe(200);
  });

  it('blocks GPTBot with 403 and notice html', () => {
    const g = createGuard({ siteName: 't', mode: 'block' });
    const out = g.handle(req({ headers: { 'user-agent': 'GPTBot/1.2' } }));
    expect(out.effective).toBe(true);
    expect(out.status).toBe(403);
    expect(out.noticeHtml).toContain('noindex');
    expect(out.noticeHtml).toContain(out.requestId);
  });

  it('observe mode never serves the notice', () => {
    const g = createGuard({ siteName: 't', mode: 'observe' });
    const out = g.handle(req({ headers: { 'user-agent': 'GPTBot/1.2' } }));
    expect(out.effective).toBe(false);
    expect(out.noticeHtml).toBeUndefined();
  });

  it('path rule forces block even for browsers', () => {
    const g = createGuard({
      siteName: 't',
      mode: 'observe',
      pathRules: [{ pattern: '/admin', mode: 'block' }],
    });
    const out = g.handle(req({ path: '/admin' }));
    expect(out.effective).toBe(true);
    expect(out.status).toBe(403);
  });

  it('rate limit escalates', () => {
    const g = createGuard({
      siteName: 't',
      mode: 'observe',
      rateLimit: { windowMs: 60_000, max: 5 },
    });
    let last = g.handle(req({ ip: '1.2.3.4' }));
    expect(last.effective).toBe(false);
    for (let i = 0; i < 6; i++) last = g.handle(req({ ip: '1.2.3.4' }));
    expect(last.signals).toContain('rate-limit-exceeded');
    expect(last.mode).toBe('block');
  });

  it('respects accept-language', () => {
    const g = createGuard({ siteName: 't', mode: 'block' });
    const out = g.handle(req({ headers: { 'user-agent': 'GPTBot/1.2', 'accept-language': 'ja' } }));
    expect(out.noticeHtml).toContain('未承諾');
  });
});
