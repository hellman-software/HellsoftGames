// Regenerate the checked-in icons and social card with `npm run assets:brand`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const file = (path) => new URL(path, root);
const svg = (markup) => Buffer.from(markup);
const mark = await readFile(file('public/favicon.svg'));

await sharp(mark).resize(32, 32).png().toFile(file('public/favicon-32x32.png').pathname);
// Apple applies its own rounded mask; use a solid background behind the mark.
await sharp({ create: { width: 180, height: 180, channels: 4, background: '#07070c' } })
  .composite([{ input: await sharp(mark).resize(148, 148).png().toBuffer(), left: 16, top: 16 }])
  .png().toFile(file('public/apple-touch-icon.png').pathname);

// ICO supports embedded PNGs. Include the common tab and shortcut sizes.
const sizes = [16, 32, 48];
const icons = await Promise.all(sizes.map((size) => sharp(mark).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
icons.forEach((icon, i) => {
  const entry = 6 + i * 16;
  header[entry] = header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(icon.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += icon.length;
});
await writeFile(file('public/favicon.ico'), Buffer.concat([header, ...icons]));

const background = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="glow"><stop stop-color="#8b5cf6" stop-opacity=".28"/><stop offset="1" stop-color="#07070c" stop-opacity="0"/></radialGradient>
    <linearGradient id="accent"><stop stop-color="#ff3dd4"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#2ee6ff"/></linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity=".035"/></pattern>
  </defs>
  <path fill="#07070c" d="M0 0h1200v630H0z"/>
  <ellipse cx="960" cy="260" rx="570" ry="500" fill="url(#glow)"/>
  <path fill="url(#grid)" d="M0 0h1200v630H0z"/>
  <path fill="url(#accent)" d="M0 0h1200v6H0z"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="164" y="110" fill="#c6c6d4" font-size="20" letter-spacing="3">GAMES BY ERIK HELLMAN</text>
    <text x="64" y="260" fill="#f3f3f8" font-size="94" font-weight="700" letter-spacing="-4">Hellsoft</text>
    <text x="64" y="356" fill="url(#accent)" font-size="94" font-weight="700" letter-spacing="-4">Games</text>
    <text x="68" y="423" fill="#f3f3f8" font-size="28">Small studio. Big worlds.</text>
    <text x="68" y="463" fill="#a4a4bb" font-size="21">Adventures, sandboxes and living worlds.</text>
    <text x="68" y="563" fill="#2ee6ff" font-size="21">games.hellsoft.se</text>
    <text x="710" y="563" fill="#a4a4bb" font-size="17" letter-spacing="2">FIND YOUR NEXT FAVOURITE</text>
  </g>
</svg>`);

async function card(path, width, height, label, pixelArt = false) {
  const image = await sharp(file(path).pathname)
    .resize(width, height, { fit: 'cover', kernel: pixelArt ? 'nearest' : 'lanczos3' })
    .png().toBuffer();
  const overlay = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#07070c" stop-opacity="0"/><stop offset="1" stop-color="#07070c" stop-opacity=".95"/></linearGradient></defs>
    <path d="M0 ${height - 85}h${width}v85H0z" fill="url(#shade)"/>
    <text x="18" y="${height - 20}" fill="#f3f3f8" font-family="Arial, Helvetica, sans-serif" font-size="${width > 300 ? 24 : 17}" font-weight="700">${label}</text>
    <rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="16" fill="none" stroke="#ffffff" stroke-opacity=".2"/>
  </svg>`);
  const mask = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" rx="16" fill="white"/></svg>`);
  return sharp(image).composite([{ input: overlay }, { input: mask, blend: 'dest-in' }]).png().toBuffer();
}

await mkdir(file('public/social'), { recursive: true });
await sharp(background).composite([
  { input: await sharp(mark).resize(76, 76).png().toBuffer(), left: 68, top: 64 },
  { input: await card('src/assets/games/fimbulvetr/myrkvidr-forest.png', 426, 220, 'Fimbulvetr', true), left: 710, top: 64 },
  { input: await card('src/assets/games/fantasy-sim-world/village-day.jpg', 202, 220, 'Fantasy Sim World'), left: 710, top: 304 },
  { input: await card('src/assets/games/bilstold/huvudstaden-night.png', 202, 220, 'Bilstöld', true), left: 934, top: 304 },
]).png().toFile(file('public/social/hellsoft-games.png').pathname);

console.log('Generated favicon fallbacks, Apple touch icon and 1200×630 social card.');
