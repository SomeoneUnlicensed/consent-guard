#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readIncidents } from '../core/log.js';
import { NOTICE_LANGS } from '../core/notice.js';

type Args = { _: string[]; [k: string]: string | boolean | string[] };

function parseArgs(argv: string[]): Args {
  const out: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? argv[++i] ?? true;
    } else out._.push(a);
  }
  return out;
}

const SNIPPET = (site: string, mode: string) =>
  `<script defer src="https://cdn.consent-guard.dev/guard.js?site=${encodeURIComponent(site)}&mode=${mode}"></script>`;

function cmdInit(args: Args) {
  const dir = resolve(String(args.dir ?? process.cwd()));
  const site = String(args.site ?? 'this site');
  const mode = String(args.mode ?? 'block');

  const nextLayouts = [
    join(dir, 'app', 'layout.tsx'),
    join(dir, 'app', 'layout.jsx'),
    join(dir, 'app', 'layout.js'),
    join(dir, 'src', 'app', 'layout.tsx'),
    join(dir, 'src', 'app', 'layout.jsx'),
    join(dir, 'src', 'app', 'layout.js'),
  ];
  const mw = join(dir, 'middleware.ts');
  const mwJs = join(dir, 'middleware.js');
  const indexHtml = join(dir, 'index.html');
  const pkgPath = join(dir, 'package.json');

  let pkg: any = {};
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {}

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if (existsSync(nextLayouts.find((p) => existsSync(p)) ?? '') || deps.next) {
    const target = existsSync(mwJs) && !existsSync(mw) ? mwJs : mw;
    if (!existsSync(target)) {
      writeFileSync(
        target,
        `import { guard } from 'consent-guard/next';\n\nexport const middleware = guard({\n  siteName: ${JSON.stringify(site)},\n  contact: '',\n  mode: '${mode}',\n  logFile: './consent-guard.log.jsonl',\n});\n\nexport const config = {\n  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],\n};\n`,
        'utf8'
      );
      console.log(`[init] created ${target} — Next.js middleware`);
    } else {
      console.log(`[init] ${target} already exists — not touching it`);
    }
    return;
  }

  if (deps.express) {
    console.log(
      `[init] Express detected. Add this line to your app:\n\n` +
        `  import { guard } from 'consent-guard/express';\n` +
        `  app.use(guard({ siteName: ${JSON.stringify(site)}, mode: '${mode}' }));\n`
    );
    return;
  }

  if (existsSync(indexHtml)) {
    const staticDir = join(dir, 'consent-guard');
    mkdirSync(staticDir, { recursive: true });
    const localJs = join(staticDir, 'guard.js');
    const pkgGuardJs = join(
      dir,
      'node_modules',
      'consent-guard',
      'static',
      'guard.js'
    );
    if (existsSync(pkgGuardJs)) {
      copyFileSync(pkgGuardJs, localJs);
      console.log(`[init] copied guard.js -> ${localJs}`);
    } else {
      console.log(
        `[init] install consent-guard in ${dir} first (npm i consent-guard) to copy the local fallback`
      );
    }
    let html = readFileSync(indexHtml, 'utf8');
    const tag = `<script defer src="consent-guard/guard.js?site=${encodeURIComponent(site)}&mode=${mode}"></script>`;
    if (html.includes('consent-guard/guard.js')) {
      console.log('[init] snippet already present in index.html');
    } else {
      html = html.replace(/<\/head>/i, `  ${tag}\n</head>`);
      writeFileSync(indexHtml, html, 'utf8');
      console.log(`[init] injected snippet into ${indexHtml}`);
    }
    return;
  }

  console.log(
    `[init] no Next/Express/index.html found in ${dir}.\n` +
      `For a static site paste into <head>:\n\n  ${SNIPPET(site, mode)}\n`
  );
}

function cmdReport(args: Args) {
  const file = resolve(String(args.file ?? 'consent-guard.log.jsonl'));
  const incidents = readIncidents(file);
  if (incidents.length === 0) {
    console.log(`No incidents in ${file}`);
    return;
  }
  const rows = incidents
    .slice(-200)
    .reverse()
    .map(
      (i) =>
        `<tr><td>${i.timeIso}</td><td>${i.ip ?? '-'}</td><td><code>${(i.userAgent || '').slice(0, 60)}</code></td><td>${i.method} ${i.path}</td><td>${i.verdict}</td><td>${i.mode}</td><td>${i.signals.join('; ')}</td><td>${i.requestId}</td></tr>`
    )
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>consent-guard report</title>
<style>body{font:14px/1.5 system-ui;margin:32px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f4f4f4}code{font-size:12px}</style>
<h1>consent-guard — ${incidents.length} incidents</h1>
<table><tr><th>time</th><th>ip</th><th>user-agent</th><th>request</th><th>verdict</th><th>mode</th><th>signals</th><th>request id</th></tr>${rows}</table>`;
  const out = resolve(String(args.out ?? 'consent-guard-report.html'));
  writeFileSync(out, html, 'utf8');
  console.log(`Report: ${out} (${incidents.length} incidents)`);
}

function cmdLangs() {
  for (const l of NOTICE_LANGS) console.log(`${l.code}\t${l.autonym}`);
}

const cmd = process.argv[2];
const args = parseArgs(process.argv.slice(3));
switch (cmd) {
  case 'init':
    cmdInit(args);
    break;
  case 'report':
    cmdReport(args);
    break;
  case 'langs':
    cmdLangs();
    break;
  default:
    console.log(`consent-guard CLI

Usage:
  consent-guard init [--dir DIR] [--site "Name"] [--mode observe|notice|block|challenge]
  consent-guard report [--file consent-guard.log.jsonl] [--out report.html]
  consent-guard langs`);
}
