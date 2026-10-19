// Minimal GIF89a encoder (LZW, 256-color global palette)
export class BitWriter {
  constructor() { this.bytes = []; this.cur = 0; this.nbits = 0; }
  write(code, width) {
    this.cur |= code << this.nbits;
    this.nbits += width;
    while (this.nbits >= 8) { this.bytes.push(this.cur & 0xff); this.cur >>= 8; this.nbits -= 8; }
  }
  end() { if (this.nbits > 0) this.bytes.push(this.cur & 0xff); }
}

export function lzw(pixels) {
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

export function subBlocks(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
  return out;
}

export function u16(n) { return [n & 0xff, (n >> 8) & 0xff]; }

export function buildGif({ width: W, height: H, delay: DELAY, palette, frames }) {
  const out = [];
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
  out.push(...u16(W), ...u16(H), 0xf7, 0, 0);
  for (const hex of palette) {
    const n = parseInt(hex.slice(1), 16);
    out.push((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }
  for (let i = palette.length; i < 256; i++) out.push(0, 0, 0);
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
