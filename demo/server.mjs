import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createGuard } from '../dist/index.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const guard = createGuard({
  siteName: 'demo.consent-guard.local',
  contact: 'security@example.com',
  mode: 'notice',
  logFile: fileURLToPath(new URL('./consent-guard.log.jsonl', import.meta.url)),
  pathRules: [
    { pattern: '/.env', mode: 'block' },
    { pattern: '/.git/', mode: 'block' },
    { pattern: '/admin', mode: 'block' },
    { pattern: '/wp-admin', mode: 'block' },
  ],
});

const SECRET =
  'ADMIN_PASSWORD=hunter2 super-secret-api-key=sk-live-DEADBEEF — this is the fake secret the attacker is hunting for';

const PAGES = {
  '/': `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Магазин «Кофе у Маши»</title></head>
<body><h1>Кофе у Маши</h1><p>Свежая обжарка. Доставка по городу.</p><p><a href="/about">О нас</a> · <a href="/prices">Цены</a></p></body></html>`,
  '/about': `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>О нас — Кофе у Маши</title></head>
<body><h1>О нас</h1><p>Мы обжариваем кофе с 2019 года.</p></body></html>`,
  '/prices': `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Цены — Кофе у Маши</title></head>
<body><h1>Цены</h1><p>Эспрессо — 150 ₽. Капучино — 220 ₽.</p></body></html>`,
  '/admin': `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Админка</title></head>
<body><h1>Админ-панель</h1><pre>${SECRET}</pre></body></html>`,
};

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const outcome = guard.handle({
    method: req.method,
    path: url.pathname,
    query: url.searchParams.toString(),
    headers: req.headers,
    ip: req.socket.remoteAddress,
    acceptLanguage: req.headers['accept-language'],
  });

  for (const [k, v] of Object.entries(outcome.headers)) res.setHeader(k, v);

  if (outcome.effective && (outcome.mode === 'block' || outcome.verdict === 'blocked')) {
    res.writeHead(outcome.status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(outcome.noticeHtml);
    return;
  }

  if (url.pathname === '/.well-known/consent-guard-report') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/admin') {
    res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' });
    res.end(outcome.noticeHtml ?? 'Forbidden');
    return;
  }

  const page = PAGES[url.pathname];
  if (page) {
    let body = page;
    if (outcome.effective && outcome.mode === 'notice') {
      body = body.replace(
        '</head>',
        `<meta name="consent-guard" content="${outcome.requestId}"></head>`
      );
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('404');
}).listen(PORT, () => {
  console.log(`demo site up: http://localhost:${PORT}`);
  console.log(`mode=notice, /admin is always blocked`);
});
