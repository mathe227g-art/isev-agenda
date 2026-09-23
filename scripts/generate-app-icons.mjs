// Rasterize the project's existing vector calendar mark into standard PWA sizes.
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const root = new URL("../public/", import.meta.url),
  out = new URL("app-icons/", root);
const original = await readFile(new URL("favicon.svg", root), "utf8");
const body = original.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const artwork = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f5f8fc"/><g transform="translate(112 112) scale(6)">${body}</g></svg>`,
);
await mkdir(out, { recursive: true });
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
])
  await sharp(artwork)
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(name, out)));
console.log("Ícones PWA gerados em 192, 512 e 180 pixels.");
