// Generates a minimal set of placeholder icons for Tauri.
// Uses only Node built-ins (zlib, fs, path).
import zlib from "zlib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "../src-tauri/icons");
fs.mkdirSync(ICONS_DIR, { recursive: true });

// CRC32 used by PNG
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) | 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4); crcVal.writeInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function makePng(size, r, g, b) {
  // Raw RGBA rows (filter byte 0 = None, then RGBA per pixel)
  const row = Buffer.alloc(1 + size * 4);
  row[0] = 0;
  for (let x = 0; x < size; x++) {
    row[1 + x * 4] = r;
    row[1 + x * 4 + 1] = g;
    row[1 + x * 4 + 2] = b;
    row[1 + x * 4 + 3] = 255;
  }
  const raw = Buffer.concat(Array(size).fill(row));
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function makeIco(pngBuffer, size) {
  // ICO header (6 bytes) + ICONDIRENTRY (16 bytes) + PNG data
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width (0 = 256)
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // color count
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4);  // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12); // data starts after header + entry

  return Buffer.concat([header, entry, pngBuffer]);
}

// Lumina violet: #7b61ff = 123, 97, 255
const R = 123, G = 97, B = 255;

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const pngs = {};
for (const s of sizes) {
  pngs[s] = makePng(s, R, G, B);
}

// PNGs required by tauri.conf.json
fs.writeFileSync(path.join(ICONS_DIR, "32x32.png"), pngs[32]);
fs.writeFileSync(path.join(ICONS_DIR, "128x128.png"), pngs[128]);
fs.writeFileSync(path.join(ICONS_DIR, "128x128@2x.png"), pngs[256]);
fs.writeFileSync(path.join(ICONS_DIR, "icon.png"), pngs[512]);

// ICO (Windows)
fs.writeFileSync(path.join(ICONS_DIR, "icon.ico"), makeIco(pngs[256], 256));

// ICNS (macOS) — minimal: just write a valid PNG named .icns
// Real macOS builds need a proper .icns; this placeholder satisfies the
// tauri.conf.json reference so the Windows build doesn't fail looking for it.
fs.writeFileSync(path.join(ICONS_DIR, "icon.icns"), pngs[1024]);

console.log("Icons written to src-tauri/icons/");
