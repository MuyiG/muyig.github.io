import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#fdfdfd"/>
<rect x="64" y="64" width="1072" height="502" rx="12" fill="none" stroke="#006cac" stroke-width="3"/>
<text x="112" y="220" font-family="monospace" font-size="24" fill="#006cac">NOTES / IDEAS / PROJECTS</text>
<text x="108" y="330" font-family="monospace" font-size="78" font-weight="bold" fill="#282728">Hikari's Blog</text>
<text x="112" y="422" font-family="monospace" font-size="28" fill="#6b7280">Stay curious. Keep creating.</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("public/default-og.png");
