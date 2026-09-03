// Compact QR encoder (bundled, no network): byte mode, EC level L, versions 1-10, mask auto.
function makeQR(text) {
  // --- GF(256) ---
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  // total data codewords for EC level L, versions 1..10
  const DATA_CW_L = [19, 34, 55, 80, 108, 136, 156, 194, 232, 274];
  // EC codewords per block, level L, versions 1..10
  const ECC_PER_BLOCK_L = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
  // number of blocks, level L, versions 1..10
  const BLOCKS_L = [1, 1, 1, 1, 1, 2, 2, 2, 2, 4];

  const ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  // --- UTF-8 bytes ---
  const bytes = [];
  for (const ch of text) {
    let c = ch.codePointAt(0);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }

  // --- pick version ---
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const lenBits = v < 10 ? 8 : 16;
    const need = 4 + lenBits + bytes.length * 8;
    if (need <= DATA_CW_L[v - 1] * 8) { version = v; break; }
  }
  if (!version) throw new Error("data too long");

  const totalData = DATA_CW_L[version - 1];
  const lenBits = version < 10 ? 8 : 16;

  // --- bit stream ---
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  put(4, 4);
  put(bytes.length, lenBits);
  for (const b of bytes) put(b, 8);
  const cap = totalData * 8;
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  const PAD = [0xec, 0x11];
  let pi = 0;
  while (data.length < totalData) data.push(PAD[pi++ % 2]);

  // --- split into blocks + Reed-Solomon ---
  const numBlocks = BLOCKS_L[version - 1];
  const eccLen = ECC_PER_BLOCK_L[version - 1];
  const shortLen = Math.floor(totalData / numBlocks);
  const numLong = totalData % numBlocks;

  // generator polynomial
  let gen = [1];
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gmul(gen[j], EXP[i]);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }
  gen.reverse(); // descending powers, gen[0] === 1

  const dataBlocks = [], eccBlocks = [];
  let off = 0;
  for (let b = 0; b < numBlocks; b++) {
    const len = shortLen + (b >= numBlocks - numLong ? 1 : 0);
    const blk = data.slice(off, off + len);
    off += len;
    dataBlocks.push(blk);
    const rem = new Array(eccLen).fill(0);
    for (const d of blk) {
      const factor = d ^ rem[0];
      rem.shift(); rem.push(0);
      for (let j = 0; j < eccLen; j++) rem[j] ^= gmul(gen[j + 1], factor);
    }
    eccBlocks.push(rem);
  }

  const interleaved = [];
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++) for (const blk of dataBlocks) if (i < blk.length) interleaved.push(blk[i]);
  for (let i = 0; i < eccLen; i++) for (const blk of eccBlocks) interleaved.push(blk[i]);

  // --- build matrix ---
  const size = version * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const setF = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) { mod[r][c] = v; reserved[r][c] = true; } };

  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      setF(rr, cc, inRing || inCore ? 1 : 0);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

  // timing
  for (let i = 8; i < size - 8; i++) { setF(6, i, i % 2 === 0 ? 1 : 0); setF(i, 6, i % 2 === 0 ? 1 : 0); }

  // alignment
  const ap = ALIGN[version];
  for (const r of ap) for (const c of ap) {
    if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const ring = Math.max(Math.abs(dr), Math.abs(dc));
      setF(r + dr, c + dc, ring === 1 ? 0 : 1);
    }
  }

  // dark module
  setF(size - 8, 8, 1);

  // reserve format areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) { if (mod[8][i] === null) setF(8, i, 0); if (mod[i][8] === null) setF(i, 8, 0); }
  }
  for (let i = 0; i < 8; i++) {
    if (mod[8][size - 1 - i] === null) setF(8, size - 1 - i, 0);
    if (mod[size - 1 - i][8] === null) setF(size - 1 - i, 8, 0);
  }

  // version info (v >= 7)
  if (version >= 7) {
    let d = version << 12;
    for (let i = 0; i < 6; i++) { if (d >> (17 - i) & 1) d ^= 0x1f25 << (5 - i); }
    const vBits = (version << 12) | (d & 0xfff);
    for (let i = 0; i < 18; i++) {
      const bit = (vBits >> i) & 1;
      setF(Math.floor(i / 3), size - 11 + (i % 3), bit);
      setF(size - 11 + (i % 3), Math.floor(i / 3), bit);
    }
  }

  // --- place data ---
  let bitIdx = 0;
  const dataBits = [];
  for (const cw of interleaved) for (let i = 7; i >= 0; i--) dataBits.push((cw >> i) & 1);

  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let j = 0; j < 2; j++) {
        const c = col - j;
        if (reserved[row][c]) continue;
        mod[row][c] = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
      }
    }
    upward = !upward;
  }

  // --- masking ---
  const maskFn = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  const FORMAT_L = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];

  const applyFormat = (m, maskIdx) => {
    const f = FORMAT_L[maskIdx];
    for (let i = 0; i < 15; i++) {
      const bit = (f >> i) & 1;
      // vertical strip (column 8)
      if (i < 6) m[i][8] = bit;
      else if (i < 8) m[i + 1][8] = bit;
      else m[size - 15 + i][8] = bit;
      // horizontal strip (row 8)
      if (i < 8) m[8][size - 1 - i] = bit;
      else if (i === 8) m[8][15 - i] = bit;
      else m[8][14 - i] = bit;
    }
    m[size - 8][8] = 1; // dark module, always last
  };

  const penalty = (m) => {
    let p = 0;
    // rule 1
    for (let r = 0; r < size; r++) {
      let run = 1;
      for (let c = 1; c < size; c++) {
        if (m[r][c] === m[r][c - 1]) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (let c = 0; c < size; c++) {
      let run = 1;
      for (let r = 1; r < size; r++) {
        if (m[r][c] === m[r - 1][c]) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    // rule 2
    for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
    // rule 3
    const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const check = (arr, i, pat) => pat.every((v, k) => arr[i + k] === v);
    for (let r = 0; r < size; r++) {
      const row = m[r];
      for (let c = 0; c + 11 <= size; c++) { if (check(row, c, pat1)) p += 40; if (check(row, c, pat2)) p += 40; }
    }
    for (let c = 0; c < size; c++) {
      const col = []; for (let r = 0; r < size; r++) col.push(m[r][c]);
      for (let r = 0; r + 11 <= size; r++) { if (check(col, r, pat1)) p += 40; if (check(col, r, pat2)) p += 40; }
    }
    // rule 4
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += m[r][c];
    const pct = (dark * 100) / (size * size);
    p += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return p;
  };

  let best = null, bestScore = Infinity;
  for (let mk = 0; mk < 8; mk++) {
    const m = mod.map((row) => row.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && maskFn[mk](r, c)) m[r][c] ^= 1;
    }
    applyFormat(m, mk);
    const s = penalty(m);
    if (s < bestScore) { bestScore = s; best = m; }
  }

  return best;
}

export { makeQR };
