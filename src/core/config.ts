export type Mode = 'observe' | 'notice' | 'block' | 'challenge';

export interface PathRule {
  pattern: string;
  mode: Mode;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface GuardConfig {
  siteName: string;
  contact?: string;
  mode: Mode;
  pathRules?: PathRule[];
  trustUA?: string[];
  rateLimit?: RateLimitConfig;
  logFile?: string;
}

export const DEFAULT_CONFIG: Omit<GuardConfig, 'siteName'> = {
  mode: 'notice',
  pathRules: [
    { pattern: '/.env', mode: 'block' },
    { pattern: '/.git/', mode: 'block' },
    { pattern: '/wp-admin', mode: 'block' },
    { pattern: '/phpmyadmin', mode: 'block' },
    { pattern: '/llms.txt', mode: 'observe' },
  ],
  trustUA: [
    'googlebot',
    'yandex',
    'bingbot',
    'duckduckbot',
    'baiduspider',
    'applebot',
    'slurp',
  ],
  rateLimit: { windowMs: 60_000, max: 120 },
};

export function resolveConfig(cfg: Partial<GuardConfig> & { siteName: string }): GuardConfig {
  return { ...DEFAULT_CONFIG, ...cfg };
}
