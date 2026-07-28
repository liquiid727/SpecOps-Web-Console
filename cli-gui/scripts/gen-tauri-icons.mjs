// Generates placeholder Tauri app icons (PNG/ICO/ICNS) so `cargo build` and
// `tauri build` have the assets referenced by tauri.conf.json.
// This is intentionally dependency-free (Node + zlib only).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "src-tauri", "icons");
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, fill) {
  const [r, g, b, a] = fill;
  const raw = Buffer.alloc(size * size * 4 + size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      raw[p++] = r;
      raw[p++] = g;
      raw[p++] = b;
      raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function encodeICO(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width 0 => 256
  entry.writeUInt8(0, 1);
  entry.writeUInt16LE(1, 2); // color planes
  entry.writeUInt16LE(32, 4); // bpp
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12);
  return Buffer.concat([header, entry, png]);
}

function encodeICNS(png256) {
  const entryType = Buffer.from("ic08", "ascii"); // 256x256 PNG
  const entryLen = Buffer.alloc(4);
  entryLen.writeUInt32BE(png256.length + 8, 0);
  const entry = Buffer.concat([entryType, entryLen, png256]);
  const total = Buffer.alloc(4);
  total.writeUInt32BE(entry.length + 8, 0);
  return Buffer.concat([Buffer.from("icns", "ascii"), total, entry]);
}

const brand = [0x4f, 0x6b, 0xc4, 0xff]; // Qoder-ish blue
const png32 = encodePNG(32, brand);
const png128 = encodePNG(128, brand);
const png256 = encodePNG(256, brand);
const png512 = encodePNG(512, brand);

writeFileSync(join(outDir, "32x32.png"), png32);
writeFileSync(join(outDir, "128x128.png"), png128);
writeFileSync(join(outDir, "128x128@2x.png"), png256);
writeFileSync(join(outDir, "icon.png"), png512);
writeFileSync(join(outDir, "icon.ico"), encodeICO(png256));
writeFileSync(join(outDir, "icon.icns"), encodeICNS(png256));

console.log("Generated Tauri icons in", outDir);
