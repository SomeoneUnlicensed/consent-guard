import type { GuardConfig } from './config.js';

export type Verdict = 'trust' | 'suspicious' | 'blocked';

export interface DetectInput {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string | undefined>;
  ip?: string;
}

export interface DetectResult {
  verdict: Verdict;
  score: number;
  signals: string[];
}

const AI_BOTS = [
  'gptbot',
  'oai-searchbot',
  'chatgpt-user',
  'claudebot',
  'claude-web',
  'claude-searchbot',
  'anthropic-ai',
  'perplexitybot',
  'perplexity-ai',
  'bytedancebot',
  'bytespider',
  'ccbot',
  'amazonbot',
  'meta-externalagent',
  'facebookbot',
  'applebot-extended',
  'diffbot',
  'imagesiftbot',
  'youbot',
  'petalbot',
  'semibot',
  'cohere-ai',
  'dataforseo',
  'headlesschrome',
  'phantomjs',
];

const SCRIPT_TOOLS = [
  'curl/',
  'wget',
  'python-requests',
  'python-httpx',
  'aiohttp',
  'scrapy',
  'httpie',
  'go-http-client',
  'okhttp',
  'java/',
  'libwww-perl',
  'ruby',
  'postmanruntime',
  'insomnia',
  'nikto',
  'sqlmap',
  'masscan',
  'nmap',
  'zgrab',
];

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+(are\s+)?(now\s+)?(dan|jailbroken)/i,
  /pretend\s+(you\s+)?(have\s+)?permission/i,
  /the\s+(owner|admin)\s+(has\s+)?(granted|allowed|approved)/i,
  /authorized\s+(pentest|penetration|security\s+test)/i,
  /system\s*prompt\s*override/i,
  /разрешил|разрешение\s+получено|дано\s+разрешение|владелец\s+согласен|пентест/i,
  /忽略(之前|先前|以上)(的)?(所有)?指令/,
  /无视(之前|先前|上面)的指令/,
];

const SCAN_PATTERNS = [
  /(^|\/)\.env($|\?)/i,
  /(^|\/)\.git\//i,
  /wp-admin|wp-login|xmlrpc\.php/i,
  /phpmyadmin|adminer|pgadmin/i,
  /\/\.aws\/|\/\.ssh\/|id_rsa/i,
  /(union\s+select|or\s+1=1|';\s*drop\s+table|<script[\s>])/i,
  /\/cgi-bin\/|\/actuator\/(env|health)/i,
];

const BROWSER_HEADERS = ['sec-ch-ua', 'sec-fetch-dest', 'sec-fetch-mode', 'accept-language'];

function hdr(headers: Record<string, string | undefined>, name: string): string {
  return (headers[name] ?? headers[name.toLowerCase()] ?? '').toLowerCase();
}

export function detect(input: DetectInput, config: GuardConfig): DetectResult {
  const signals: string[] = [];
  let score = 0;
  const ua = hdr(input.headers, 'user-agent');

  for (const t of config.trustUA ?? []) {
    if (ua.includes(t)) {
      return { verdict: 'trust', score: 0, signals: [`trusted-ua:${t}`] };
    }
  }

  for (const bot of AI_BOTS) {
    if (ua.includes(bot)) {
      score += 100;
      signals.push(`ai-bot-ua:${bot}`);
      break;
    }
  }

  for (const tool of SCRIPT_TOOLS) {
    if (ua.includes(tool)) {
      score += 40;
      signals.push(`script-tool-ua:${tool}`);
      break;
    }
  }

  if (!ua) {
    score += 30;
    signals.push('empty-ua');
  }

  const browserHeaderCount = BROWSER_HEADERS.filter((h) => hdr(input.headers, h)).length;
  if (ua && /mozilla|chrome|safari|firefox/i.test(ua) && browserHeaderCount === 0) {
    score += 40;
    signals.push('browser-ua-without-browser-headers');
  }
  if (browserHeaderCount >= 2) {
    score -= 10;
    signals.push('browser-headers-present');
  }

  const openaiH = input.headers['openai-prompt'] ?? input.headers['x-openai'];
  const anthropicH = input.headers['anthropic-version'] ?? input.headers['x-anthropic'];
  if (openaiH || anthropicH) {
    score += 100;
    signals.push('ai-api-headers');
  }

  const full = `${input.path}?${input.query}`;
  let decoded = full;
  try {
    decoded = decodeURIComponent(full.replace(/\+/g, ' '));
  } catch {}
  for (const p of SCAN_PATTERNS) {
    if (p.test(full) || p.test(decoded)) {
      score += 60;
      signals.push(`scan-pattern:${p.source.slice(0, 40)}`);
      break;
    }
  }

  for (const p of INJECTION_PATTERNS) {
    if (p.test(full) || p.test(decoded)) {
      score += 50;
      signals.push(`injection-pattern:${p.source.slice(0, 40)}`);
      break;
    }
  }

  if (input.method !== 'GET' && input.method !== 'HEAD') {
    score += 15;
    signals.push(`non-safe-method:${input.method}`);
  }

  const verdict: Verdict =
    score >= 100 ? 'blocked' : score >= 40 ? 'suspicious' : 'trust';
  return { verdict, score, signals };
}

export function modeOverrideFor(path: string, config: GuardConfig): GuardConfig['mode'] | undefined {
  for (const rule of config.pathRules ?? []) {
    if (path.includes(rule.pattern)) return rule.mode;
  }
  return undefined;
}
