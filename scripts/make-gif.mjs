// Generates assets/banner.gif — animated rainbow-cat banner (pure Node, no deps)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 960, H = 240, FRAMES = 12, DELAY = 8;

// ---------- palette ----------
const PAL = [
  '#0b0d10', '#000000', '#ffffff', '#ff6b5e', '#ff2d1f',
  '#e8eaed', '#8b929c', '#545b66', '#23272e',
  '#ff3b30', '#ff9500', '#ffd60a', '#30d158', '#00c7be', '#0a84ff', '#5e5ce6', '#bf5af2',
  '#ff8fa3', '#7a8290', '#4a5160', '#30d158',
];
const bg = 0, black = 1, white = 2, accent = 3, red = 4;
const light = 5, muted = 6, dim = 7, groundC = 8;
const rb = [9, 10, 11, 12, 13, 14, 15];
const pink = 17, gray = 18, grayD = 19, eyeG = 20;

// ---------- 5x7 font ----------
const FONT = {
  A:[0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  B:[0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  C:[0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  D:[0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110],
  E:[0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  F:[0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  G:[0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01111],
  H:[0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  I:[0b01110,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
  J:[0b00111,0b00010,0b00010,0b00010,0b00010,0b10010,0b01100],
  K:[0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  L:[0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  M:[0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
  N:[0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  O:[0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  P:[0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  Q:[0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
  R:[0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  S:[0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  T:[0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  U:[0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  V:[0b10001,0b10001,0b10001,0b10001,0b10001,0b01010,0b00100],
  W:[0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  X:[0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
  Y:[0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  Z:[0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
  0:[0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
  1:[0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
  2:[0b01110,0b10001,0b00001,0b00110,0b01000,0b10000,0b11111],
  3:[0b11111,0b00010,0b00100,0b00010,0b00001,0b10001,0b01110],
  4:[0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  5:[0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
  6:[0b00110,0b01000,0b10000,0b11110,0b10001,0b10001,0b01110],
  7:[0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
  8:[0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  9:[0b01110,0b10001,0b10001,0b01111,0b00001,0b00010,0b01100],
  '-':[0,0,0,0b11111,0,0,0],
  '.':[0,0,0,0,0,0b00100,0b00100],
  ' ':[0,0,0,0,0,0,0],
};

// ---------- sprites ----------
const CAT_OPEN = [
  '.....KK......KK.....',
  '....KRRK....KRRK....',
  '....KRRRKKKKRRRK....',
  '...KRRRRRRRRRRRRK...',
  '..KRRRRRRRRRRRRRRK..',
  '..KRREERRRRRREERRK..',
  '..KRREERRRRRREERRK..',
  '..KRRRRRPPPRRRRRRK..',
  '..KRRRRWWWWWRRRRRK..',
  '...KRRRRRRRRRRRRK...',
  '...KKRRRRRRRRRRKK...',
  '....KKRRRRRRRRKK....',
  '..KKOOOOOOOOOOOOKK..',
  '.KYYYYOOOOOOOOOOOOK.',
  '.KGGGGGWWWWWWGOOOOK.',
  '.KBBBBBGWWWGGOOOOOOK',
  '.KVVVVVGGGGGGOOOOOOK',
  '.KPPPPPPOOOOOOKKKKKK',
  '.KPPKKKKPPKKKKPPKKKK',
  '.KKKKK..KKK..KKKKKKK',
];
const CAT_CLOSED = CAT_OPEN.map((r, i) =>
  i === 5 ? '..KRRKKRRRRRRKKRRRK..' :
  i === 6 ? '..KRRRRRRRRRRRRRRRK..' : r
);
const CAT = [CAT_OPEN, CAT_CLOSED];

const BOT = [
  '..KKKKKK..',
  '.KGGGGGGK.',
  '.KGKKKKGK.',
  '.KGKRKRGK.',
  '.KGGGGGGK.',
  'KKGGGGGGKK',
  '.KGGGGGGK.',
  '.KKKKKKKK.',
];
const BOT_X = [
  '..KKKKKK..',
  '.KGGGGGGK.',
  '.KGKXKXGK.',
  '.KGKKKKGK.',
  '.KGGGGGGK.',
  'KKGGGGGGKK',
  '.KGGGGGGK.',
  '.KKKKKKKK.',
];

// ---------- canvas ----------
function makeFrame(fi) {
  const px = new Uint8Array(W * H).fill(bg);
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c; };
  const rect = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
  };

  rect(0, 200, W, 1, groundC);

  // text
  const text = (str, x, y, s, c) => {
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]] ?? FONT[' '];
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 5; col++)
          if (g[row] & (1 << (4 - col))) rect(x + (i * 6 + col) * s, y + row * s, s, s, c);
    }
  };
  text('CONSENT-GUARD', 210, 36, 4, light);
  text('ACCESS NOT AUTHORIZED', 212, 84, 2, accent);
  text('THE AI AGENT STOPPED ITSELF', 212, 122, 1, muted);
  text('COUNTER-INJECTION FOR YOUR SITE', 212, 138, 1, dim);

  // rainbow cat, bobbing (2x scale)
  const S = 2;
  const bob = fi % 2 === 1 ? -4 : 0;
  const catX = 44, catBaseY = 200 - 20 * S + bob;
  const sprite = CAT[fi % 4 === 3 ? 1 : 0];
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      let c;
      if (ch === 'K') c = black;
      else if (ch === 'W') c = white;
      else if (ch === 'P') c = pink;
      else if (ch === 'E') c = eyeG;
      else {
        const band = row < 12 ? Math.min(6, Math.floor(row / 2)) : Math.min(6, Math.floor((row - 12) / 1.5));
        c = rb[band];
      }
      rect(catX + col * S, catBaseY + row * S, S, S, c);
    }
  }
  // rainbow trail flowing into the cat
  const phase = fi * 1.2;
  const trailEnd = catX + 6;
  for (let x = 0; x < trailEnd; x++) {
    for (let s = 0; s < 7; s++) {
      const y = Math.round(catBaseY + 18 + s * 3 + Math.sin((x + phase * 10) / 9) * 4);
      const fade = x > trailEnd - 30 ? Math.max(0, Math.floor(((trailEnd - x) / 30) * 6)) : 6;
      if (s <= fade) set(x, y, rb[s]);
    }
  }
  // vibing note
  if (fi % 3 !== 2) {
    const nx = catX + 44 + (fi % 3) * 2, ny = catBaseY - 16 - (fi % 3) * 4;
    rect(nx, ny, 3, 3, accent); rect(nx + 3, ny - 6, 2, 8, accent);
  }

  // GPTBot bouncing off the wall
  const wallX = 736;
  rect(wallX, 150, 2, 50, dim);
  const bounce = Math.round(Math.abs(Math.sin(phase / 2.5)) * 16);
  const bx = wallX - 16 - bounce;
  const bounced = bounce < 4;
  const bot = bounced ? BOT_X : BOT;
  for (let row = 0; row < bot.length; row++)
    for (let col = 0; col < bot[row].length; col++) {
      const ch = bot[row][col];
      if (ch === '.') continue;
      set(bx + col, 172 + row, ch === 'K' ? black : ch === 'R' || ch === 'X' ? red : gray);
    }
  text('GPTBOT', bx - 5, 186, 1, dim);
  if (bounced) text('403', bx - 46, 158, 2, red);

  return px;
}

// ---------- GIF LZW encoder ----------
class BitWriter {
  constructor() { this.bytes = []; this.cur = 0; this.nbits = 0; }
  write(code, width) {
    this.cur |= code << this.nbits;
    this.nbits += width;
    while (this.nbits >= 8) { this.bytes.push(this.cur & 0xff); this.cur >>= 8; this.nbits -= 8; }
  }
  end() { if (this.nbits > 0) this.bytes.push(this.cur & 0xff); }
}

function lzw(pixels) {
  const CLEAR = 256, EOI = 257;
  const bw = new BitWriter();
  let dict = new Map(), next = 258, width = 9;
  const emitClear = () => { bw.write(CLEAR, width); dict = new Map(); next = 258; width = 9; };
  emitClear();
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i];
    const key = prefix * 4096 + k;
    const hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    bw.write(prefix, width);
    if (next < 4096) {
      dict.set(key, next);
      next++;
      if (next > (1 << width) && width < 12) width++;
    } else {
      emitClear();
    }
    prefix = k;
  }
  bw.write(prefix, width);
  bw.write(EOI, width);
  bw.end();
  return bw.bytes;
}

function subBlocks(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
  return out;
}

function u16(n) { return [n & 0xff, (n >> 8) & 0xff]; }

function buildGif(frames) {
  const out = [];
  out.push(...[0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
  out.push(...u16(W), ...u16(H), 0xf7, 0, 0);
  for (const hex of PAL) {
    const n = parseInt(hex.slice(1), 16);
    out.push((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }
  for (let i = PAL.length; i < 256; i++) out.push(0, 0, 0);
  // netscape loop
  out.push(0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map(c => c.charCodeAt(0)), 0x03, 0x01, 0, 0, 0);
  for (const px of frames) {
    out.push(0x21, 0xf9, 0x04, 0x04, ...u16(DELAY), 0, 0);
    out.push(0x2c, 0, 0, 0, 0, ...u16(W), ...u16(H), 0);
    out.push(8);
    out.push(...subBlocks(lzw(px)));
  }
  out.push(0x3b);
  return Buffer.from(out);
}

const frames = [];
for (let i = 0; i < FRAMES; i++) frames.push(makeFrame(i));
const gif = buildGif(frames);
const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'banner.gif');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, gif);
console.log(`banner.gif: ${gif.length} bytes, ${FRAMES} frames ${W}x${H}`);
