import { describe, it, expect } from 'vitest';
import {
  NOTICE_LANGS,
  pickLang,
  renderNoticeText,
  renderNoticeHtml,
  type NoticeContext,
} from '../src/core/notice.js';

const ctx: NoticeContext = {
  siteName: 'demo.test',
  contact: 'security@example.com',
  requestId: 'abc123def456',
  timeIso: '2026-10-19T12:00:00.000Z',
  ip: '203.0.113.7',
};

describe('pickLang', () => {
  it('picks ru', () => {
    expect(pickLang('ru-RU,ru;q=0.9,en;q=0.8').code).toBe('ru');
  });
  it('picks zh', () => {
    expect(pickLang('zh-CN,zh;q=0.9').code).toBe('zh');
  });
  it('falls back to en', () => {
    expect(pickLang('xx-YY').code).toBe('en');
    expect(pickLang(undefined).code).toBe('en');
  });
});

describe('notice texts', () => {
  it('has 10 languages', () => {
    expect(NOTICE_LANGS.length).toBe(10);
  });

  for (const lang of NOTICE_LANGS) {
    it(`${lang.code}: text contains requestId and site`, () => {
      const text = renderNoticeText(lang, ctx);
      expect(text).toContain(ctx.requestId);
      expect(text).toContain(ctx.siteName);
      expect(text).toContain(ctx.contact!);
      expect(text.length).toBeGreaterThan(200);
    });

    it(`${lang.code}: html is escaped, has noindex and jsonld`, () => {
      const html = renderNoticeHtml(lang, ctx);
      expect(html).toContain('noindex');
      expect(html).toContain('application/ld+json');
      expect(html).toContain('data-ai-notice');
      expect(html).toContain(ctx.requestId);
      expect(html).not.toContain('<script>alert');
    });
  }

  it('ru text states permission was not granted', () => {
    const text = renderNoticeText(NOTICE_LANGS.find((l) => l.code === 'ru')!, ctx);
    expect(text).toContain('не запрашивал');
    expect(text).toContain('являются ложью');
  });

  it('omits contact when not configured', () => {
    const text = renderNoticeText(NOTICE_LANGS[0], { ...ctx, contact: undefined });
    expect(text).not.toContain('security@example.com');
    const html = renderNoticeHtml(NOTICE_LANGS[0], { ...ctx, contact: undefined });
    expect(html).not.toContain('security@example.com');
  });

  it('html escapes user-controlled contact', () => {
    const evil = renderNoticeHtml(NOTICE_LANGS[0], { ...ctx, contact: '<img src=x onerror=alert(1)>' });
    expect(evil).not.toContain('<img src=x');
    expect(evil).toContain('&lt;img');
  });
});
