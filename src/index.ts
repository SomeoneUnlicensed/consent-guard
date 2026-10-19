import { randomBytes } from 'node:crypto';
import { detect, modeOverrideFor, type DetectInput, type DetectResult, type Verdict } from './core/detect.js';
import { resolveConfig, type GuardConfig, type Mode } from './core/config.js';
import { pickLang, renderNoticeHtml, renderNoticeText, type NoticeContext } from './core/notice.js';
import { guardHeaders } from './core/headers.js';
import { logIncident } from './core/log.js';
import { createRateState, rateExceeded, type RateState } from './core/rate.js';

export interface GuardRequest extends DetectInput {
  acceptLanguage?: string;
}

export interface GuardOutcome {
  verdict: Verdict;
  mode: Mode;
  effective: boolean;
  score: number;
  signals: string[];
  requestId: string;
  status: number;
  noticeHtml?: string;
  noticeText?: string;
  headers: Record<string, string>;
}

export interface Guard {
  config: GuardConfig;
  handle(req: GuardRequest): GuardOutcome;
}

export function createGuard(partial: Partial<GuardConfig> & { siteName: string }): Guard {
  const config = resolveConfig(partial);
  const rateState: RateState = createRateState();

  function handle(req: GuardRequest): GuardOutcome {
    const detection = detect(req, config);
    const requestId = randomBytes(6).toString('hex');
    const headers = guardHeaders();

    const rl = config.rateLimit;
    const ipKey = req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
    let rateHit = false;
    if (rl) rateHit = rateExceeded(rateState, String(ipKey), rl.windowMs, rl.max);
    const signals = rateHit ? [...detection.signals, 'rate-limit-exceeded'] : detection.signals;
    const score = rateHit ? detection.score + 80 : detection.score;
    const verdict: Verdict =
      score >= 100 ? 'blocked' : score >= 40 ? 'suspicious' : detection.verdict;

    const override = modeOverrideFor(req.path, config);
    const forced = override !== undefined;
    let mode = override ?? config.mode;
    if (rateHit && mode === 'observe') mode = 'block';

    const effective = mode !== 'observe' && (forced || verdict !== 'trust');

    let status = 200;
    let noticeHtml: string | undefined;
    let noticeText: string | undefined;

    if (effective) {
      const ctx: NoticeContext = {
        siteName: config.siteName,
        contact: config.contact,
        requestId,
        timeIso: new Date().toISOString(),
        ip: req.ip,
      };
      const lang = pickLang(req.acceptLanguage);
      noticeHtml = renderNoticeHtml(lang, ctx);
      noticeText = renderNoticeText(lang, ctx);

      if (mode === 'block') status = 403;
      else if (mode === 'challenge') status = 429;
      else if (mode === 'notice' && verdict === 'blocked') status = 403;
    }

    logIncident(config.logFile, {
      timeIso: new Date().toISOString(),
      requestId,
      ip: req.ip,
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: String(req.headers['user-agent'] ?? ''),
      verdict,
      mode,
      score,
      signals,
    });

    return { verdict, mode, effective, score, signals, requestId, status, noticeHtml, noticeText, headers };
  }

  return { config, handle };
}

export { detect } from './core/detect.js';
export { resolveConfig } from './core/config.js';
export type { GuardConfig, Mode } from './core/config.js';
export { pickLang, renderNoticeHtml, renderNoticeText, NOTICE_LANGS } from './core/notice.js';
export type { NoticeLang, NoticeContext } from './core/notice.js';
export type { DetectResult, Verdict } from './core/detect.js';
