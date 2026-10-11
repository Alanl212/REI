// Converts a TTF/OTF into a subset three.js typeface JSON (same math as three's TTFLoader).
// Usage: node scripts/make-typeface.mjs <font.ttf> <out.json> [chars]
import fs from 'node:fs';
import opentype from 'opentype.js';

const [src, out, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+–-.,!?&\'’ '] = process.argv.slice(2);
if (!src || !out) {
  console.error('Usage: node scripts/make-typeface.mjs <font.ttf> <out.json> [chars]');
  process.exit(1);
}

const buf = fs.readFileSync(src);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const round = Math.round;
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const glyphs = {};

for (const ch of new Set(chars)) {
  const glyph = font.charToGlyph(ch);
  if (!glyph || glyph.index === 0) { console.warn('missing glyph', JSON.stringify(ch)); continue; }
  const token = { ha: round(glyph.advanceWidth * scale), x_min: round((glyph.xMin ?? 0) * scale), x_max: round((glyph.xMax ?? 0) * scale), o: '' };
  for (const c of glyph.path.commands) {
    const type = c.type.toLowerCase() === 'c' ? 'b' : c.type.toLowerCase();
    token.o += type + ' ';
    if (c.x !== undefined) token.o += round(c.x * scale) + ' ' + round(c.y * scale) + ' ';
    if (c.x1 !== undefined) token.o += round(c.x1 * scale) + ' ' + round(c.y1 * scale) + ' ';
    if (c.x2 !== undefined) token.o += round(c.x2 * scale) + ' ' + round(c.y2 * scale) + ' ';
  }
  glyphs[ch] = token;
}

const json = {
  glyphs,
  familyName: font.getEnglishName('fullName'),
  ascender: round(font.ascender * scale),
  descender: round(font.descender * scale),
  underlinePosition: font.tables.post.underlinePosition,
  underlineThickness: font.tables.post.underlineThickness,
  boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
  resolution: 1000,
  original_font_information: { fullName: font.getEnglishName('fullName'), license: font.getEnglishName('license') || 'SIL Open Font License 1.1' },
};
fs.writeFileSync(out, JSON.stringify(json));
console.log(`wrote ${out}: ${Object.keys(glyphs).length} glyphs, ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
