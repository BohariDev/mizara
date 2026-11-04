#!/usr/bin/env node
'use strict';

/**
 * Builds the payment preset logos served from backend/public/presets.
 *
 * For each preset slug, the first source that works is used:
 *   1. scripts/logos/sources/<slug>.(png|jpg|jpeg|webp|svg)  (added by hand)
 *   2. Simple Icons glyph on the brand color                  (logos.config.js)
 *   3. logo.dev, only if LOGO_DEV_TOKEN is set
 *   4. The brand website's icons (apple-touch-icon, icon links, web app
 *      manifest, favicon.ico), picking the largest
 *   5. Google's favicon service, then DuckDuckGo's
 *
 * Every logo is written as a 256x256 square WebP named <slug>.webp. A contact
 * sheet (scripts/logos/out/contact-sheet.png) shows all of them for review.
 *
 * Usage:
 *   pnpm logos:build                       build every preset
 *   pnpm logos:build --only netflix,sss    build only these slugs
 *   pnpm logos:build --offline             skip downloads (sources + Simple Icons only)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const simpleIcons = require('simple-icons');

// The preset list is TypeScript; ts-node compiles it on the fly.
require('ts-node').register({ transpileOnly: true });
const {
    RECURRING_PAYMENT_PRESETS: PRESETS,
} = require('../../src/recurring-payment/recurring-payment-presets.data');
const LOGO_CONFIG = require('./logos.config');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT, 'public', 'presets');
const SOURCES_DIR = path.join(__dirname, 'sources');
const REVIEW_DIR = path.join(__dirname, 'out');

const SIZE = 256;
const PADDING = 32; // space around logos that don't fill the whole tile
const MIN_GOOD_SIZE = 128; // source images smaller than this are flagged
const SOURCE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = { only: null, offline: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--offline') args.offline = true;
        else if (argv[i] === '--only')
            args.only = argv[++i].split(',').map((s) => s.trim());
        else if (argv[i].startsWith('--only='))
            args.only = argv[i].slice(7).split(',');
    }
    return args;
}

/** Relative luminance (0 = black, 1 = white) of an [r, g, b] colour. */
function luminance([r, g, b]) {
    const channel = (v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function hexToRgb(hex) {
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function escapeXml(text) {
    return text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function fetchWithTimeout(url, options = {}) {
    return fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) },
    });
}

async function fetchImage(url) {
    try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) return null;
        let buffer = Buffer.from(await res.arrayBuffer());
        if (isIco(buffer)) buffer = extractPngFromIco(buffer);
        return buffer && (await readImageSize(buffer)) ? buffer : null;
    } catch {
        return null;
    }
}

function isIco(buffer) {
    return (
        buffer.length > 6 &&
        buffer.readUInt16LE(0) === 0 &&
        buffer.readUInt16LE(2) === 1
    );
}

/**
 * sharp can't read .ico files, but modern ones store each size as an embedded
 * PNG. Returns the largest embedded PNG, or null if the icon only has
 * old-style bitmap entries.
 */
function extractPngFromIco(buffer) {
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const count = buffer.readUInt16LE(4);
    let best = null;
    for (let i = 0; i < count; i++) {
        const entry = 6 + i * 16;
        if (entry + 16 > buffer.length) break;
        const size = buffer.readUInt8(entry) || 256; // 0 means 256px
        const length = buffer.readUInt32LE(entry + 8);
        const offset = buffer.readUInt32LE(entry + 12);
        const data = buffer.subarray(offset, offset + length);
        if (
            data.subarray(0, 4).equals(PNG_SIGNATURE) &&
            (!best || size > best.size)
        ) {
            best = { size, data };
        }
    }
    return best ? Buffer.from(best.data) : null;
}

/** Returns the pixel size of an image, or null if sharp can't read it (e.g. .ico). */
async function readImageSize(buffer) {
    try {
        const meta = await sharp(buffer).metadata();
        if (!meta.width || !meta.height) return null;
        // Vector images can be rendered at any size.
        if (meta.format === 'svg')
            return { width: 1024, height: 1024, vector: true };
        return { width: meta.width, height: meta.height, vector: false };
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function findManualSource(slug) {
    for (const ext of SOURCE_EXTENSIONS) {
        const file = path.join(SOURCES_DIR, slug + ext);
        if (fs.existsSync(file)) return file;
    }
    return null;
}

function findSimpleIcon(slug) {
    return (
        Object.values(simpleIcons).find((icon) => icon && icon.slug === slug) ||
        null
    );
}

async function fromLogoDev(domain) {
    const token = process.env.LOGO_DEV_TOKEN;
    if (!token) return null;
    return fetchImage(
        `https://img.logo.dev/${encodeURIComponent(domain)}?token=${token}&size=${SIZE}&format=png`,
    );
}

/**
 * Downloads the brand website's home page, collects its icon links
 * (apple-touch-icon, icon) plus the conventional /apple-touch-icon.png, and
 * returns the largest image that can be read.
 */
async function fromWebsite(domain) {
    // Some sites only answer on www. (or only without it).
    const hosts = domain.startsWith('www.')
        ? [domain]
        : [domain, `www.${domain}`];
    let html = '';
    let baseUrl = `https://${domain}/`;
    for (const host of hosts) {
        try {
            const res = await fetchWithTimeout(`https://${host}/`);
            if (!res.ok) continue;
            baseUrl = res.url || `https://${host}/`;
            html = await res.text();
            break;
        } catch {
            // Try the next host, then fall through to the conventional paths.
        }
    }

    const candidates = [];
    let manifestUrl = null;
    for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
        const rel = (tag.match(/\brel\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
        const href = (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1];
        if (!href) continue;
        let url;
        try {
            url = new URL(href.replace(/&amp;/g, '&'), baseUrl).href;
        } catch {
            continue; // Ignore malformed URLs.
        }
        if (/(^|\s)manifest(\s|$)/i.test(rel)) manifestUrl = url;
        else if (
            /(^|\s)(apple-touch-icon(-precomposed)?|icon|shortcut icon)(\s|$)/i.test(
                rel,
            )
        ) {
            candidates.push({ url, apple: /apple-touch-icon/i.test(rel) });
        }
    }

    // Web app manifests often list 192px and 512px icons.
    if (manifestUrl) {
        try {
            const res = await fetchWithTimeout(manifestUrl);
            const manifest = res.ok ? await res.json() : {};
            for (const icon of manifest.icons || []) {
                if (icon.src)
                    candidates.push({
                        url: new URL(icon.src, manifestUrl).href,
                        apple: false,
                    });
            }
        } catch {
            // No usable manifest.
        }
    }

    for (const origin of new Set([
        new URL(baseUrl).origin,
        `https://${domain}`,
    ])) {
        candidates.push({ url: `${origin}/apple-touch-icon.png`, apple: true });
        candidates.push({ url: `${origin}/favicon.ico`, apple: false });
    }

    let best = null;
    const seen = new Set();
    for (const candidate of candidates.slice(0, 14)) {
        if (seen.has(candidate.url)) continue;
        seen.add(candidate.url);

        const buffer = await fetchImage(candidate.url);
        if (!buffer) continue;
        const size = await readImageSize(buffer);
        const score =
            Math.min(size.width, size.height) + (candidate.apple ? 1 : 0);
        if (!best || score > best.score) best = { buffer, score };
    }
    return best ? best.buffer : null;
}

async function fromGoogleFavicon(domain) {
    const buffer = await fetchImage(
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${SIZE}`,
    );
    if (!buffer) return null;
    // Google returns a generic 16px globe when it has nothing for the domain.
    const size = await readImageSize(buffer);
    return size && size.width > 16 ? buffer : null;
}

/** DuckDuckGo's icon cache; useful when the site itself blocks or times out. */
async function fromDuckDuckGo(domain) {
    const buffer = await fetchImage(
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    );
    if (!buffer) return null;
    const size = await readImageSize(buffer);
    return size && size.width > 16 ? buffer : null;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** White (or black, on light colours) glyph centred on the brand colour. */
async function renderSimpleIcon(icon) {
    const background = `#${icon.hex}`;
    const glyph = luminance(hexToRgb(icon.hex)) > 0.6 ? '#000000' : '#FFFFFF';
    const glyphSize = SIZE * 0.56;
    const offset = (SIZE - glyphSize) / 2;
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
            <rect width="${SIZE}" height="${SIZE}" fill="${background}"/>
            <g transform="translate(${offset} ${offset}) scale(${glyphSize / 24})">
                <path d="${icon.path}" fill="${glyph}"/>
            </g>
        </svg>`;
    return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
}

/**
 * Turns any downloaded or hand-added image into a square tile:
 * - square, opaque images (typical app icons) fill the whole tile;
 * - transparent or non-square logos are trimmed and centred with padding on
 *   white, or on near-black when the logo itself is very light.
 */
async function renderImage(buffer) {
    const input = () => sharp(buffer, { density: 384 });
    const meta = await input().metadata();
    const aspect = meta.width / meta.height;

    const { data, info } = await input()
        .resize(64, 64, { fit: 'fill' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const cornerAlphas = [
        0,
        info.width - 1,
        (info.height - 1) * info.width,
        info.height * info.width - 1,
    ].map((pixel) => data[pixel * 4 + 3]);
    const isTransparent = cornerAlphas.some((alpha) => alpha < 250);
    const isSquare = aspect > 0.9 && aspect < 1.1;

    if (isSquare && !isTransparent) {
        return input()
            .resize(SIZE, SIZE, { fit: 'cover' })
            .flatten({ background: '#FFFFFF' })
            .webp({ quality: 90 })
            .toBuffer();
    }

    // Average colour of the visible pixels decides the background.
    let total = 0;
    let sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        if (alpha < 0.5) continue;
        sum = [sum[0] + data[i], sum[1] + data[i + 1], sum[2] + data[i + 2]];
        total++;
    }
    const average = total ? sum.map((v) => v / total) : [0, 0, 0];
    const background =
        isTransparent && luminance(average) > 0.8 ? '#111111' : '#FFFFFF';

    let trimmed;
    try {
        trimmed = await input().trim().toBuffer();
    } catch {
        trimmed = await input().toBuffer(); // trim fails on single-colour images
    }

    const inner = SIZE - PADDING * 2;
    const logo = await sharp(trimmed)
        .resize(inner, inner, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

    return sharp({
        create: { width: SIZE, height: SIZE, channels: 4, background },
    })
        .composite([{ input: logo, top: PADDING, left: PADDING }])
        .flatten({ background })
        .webp({ quality: 90 })
        .toBuffer();
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function buildLogo(slug, args) {
    const config = LOGO_CONFIG[slug] || {};

    const manual = findManualSource(slug);
    if (manual) {
        const buffer = fs.readFileSync(manual);
        const size = await readImageSize(buffer);
        if (!size)
            return {
                slug,
                source: 'missing',
                note: `can't read ${path.basename(manual)}`,
            };
        return {
            slug,
            source: 'manual',
            size,
            image: await renderImage(buffer),
        };
    }

    if (config.simpleIcon) {
        const icon = findSimpleIcon(config.simpleIcon);
        if (icon)
            return {
                slug,
                source: 'simple-icons',
                size: { vector: true },
                image: await renderSimpleIcon(icon),
            };
    }

    if (!args.offline && config.domain) {
        const attempts = [
            ['logo.dev', fromLogoDev],
            ['website', fromWebsite],
            ['google-favicon', fromGoogleFavicon],
            ['duckduckgo', fromDuckDuckGo],
        ];
        // Stop at the first good-sized image; otherwise keep the largest found.
        let best = null;
        for (const [source, fetcher] of attempts) {
            const buffer = await fetcher(config.domain);
            if (!buffer) continue;
            const size = await readImageSize(buffer);
            const pixels = size.vector
                ? Infinity
                : Math.min(size.width, size.height);
            if (!best || pixels > best.pixels)
                best = { source, size, buffer, pixels };
            if (pixels >= MIN_GOOD_SIZE) break;
        }
        if (best) {
            return {
                slug,
                source: best.source,
                size: best.size,
                image: await renderImage(best.buffer),
            };
        }
    }

    return {
        slug,
        source: 'missing',
        note: config.domain ? '' : 'no domain in logos.config.js',
    };
}

async function buildContactSheet(results) {
    const tile = 128;
    const labelHeight = 44;
    const gap = 16;
    const columns = 7;
    const rows = Math.ceil(results.length / columns);
    const width = columns * (tile + gap) + gap;
    const height = rows * (tile + labelHeight + gap) + gap;

    const composites = [];
    for (const [index, result] of results.entries()) {
        const left = gap + (index % columns) * (tile + gap);
        const top =
            gap + Math.floor(index / columns) * (tile + labelHeight + gap);

        const warn = result.source === 'missing' || result.lowRes;
        const image = result.image
            ? await sharp(result.image).resize(tile, tile).png().toBuffer()
            : await sharp({
                  create: {
                      width: tile,
                      height: tile,
                      channels: 3,
                      background: '#F3D6D6',
                  },
              })
                  .png()
                  .toBuffer();
        composites.push({ input: image, top, left });

        const caption = result.source + (result.lowRes ? ' · low res' : '');
        const label = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${labelHeight}">
                <text x="${tile / 2}" y="16" font-family="Arial, sans-serif" font-size="12" font-weight="bold"
                      text-anchor="middle" fill="#222">${escapeXml(result.slug)}</text>
                <text x="${tile / 2}" y="33" font-family="Arial, sans-serif" font-size="11"
                      text-anchor="middle" fill="${warn ? '#C62828' : '#666'}">${escapeXml(caption)}</text>
            </svg>`;
        composites.push({ input: Buffer.from(label), top: top + tile, left });
    }

    return sharp({
        create: { width, height, channels: 3, background: '#FFFFFF' },
    })
        .composite(composites)
        .png()
        .toBuffer();
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const allSlugs = PRESETS.map((preset) => preset.slug);
    const slugs = args.only
        ? allSlugs.filter((slug) => args.only.includes(slug))
        : allSlugs;
    if (args.only) {
        const unknown = args.only.filter((slug) => !allSlugs.includes(slug));
        if (unknown.length)
            console.warn(`Unknown slugs ignored: ${unknown.join(', ')}`);
    }

    const unconfigured = allSlugs.filter((slug) => !LOGO_CONFIG[slug]);
    if (unconfigured.length)
        console.warn(`No entry in logos.config.js: ${unconfigured.join(', ')}`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(REVIEW_DIR, { recursive: true });

    console.log(
        `Building ${slugs.length} logos${args.offline ? ' (offline)' : ''}...\n`,
    );

    // Small pool so a slow website doesn't hold up the rest.
    const results = new Array(slugs.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: 5 }, async () => {
            while (next < slugs.length) {
                const index = next++;
                const slug = slugs[index];
                try {
                    results[index] = await buildLogo(slug, args);
                } catch (error) {
                    results[index] = {
                        slug,
                        source: 'missing',
                        note: error.message,
                    };
                }
                const result = results[index];
                result.lowRes = !!(
                    result.size &&
                    !result.size.vector &&
                    Math.min(result.size.width, result.size.height) <
                        MIN_GOOD_SIZE
                );
                if (result.image)
                    fs.writeFileSync(
                        path.join(OUTPUT_DIR, `${slug}.webp`),
                        result.image,
                    );
                console.log(
                    `  ${slug.padEnd(24)} ${result.source}${result.lowRes ? ' (low res)' : ''}`,
                );
            }
        }),
    );

    fs.writeFileSync(
        path.join(REVIEW_DIR, 'contact-sheet.png'),
        await buildContactSheet(results),
    );
    fs.writeFileSync(
        path.join(REVIEW_DIR, 'report.json'),
        JSON.stringify(
            results.map(({ slug, source, size, lowRes, note }) => ({
                slug,
                source,
                size,
                lowRes,
                note,
            })),
            null,
            2,
        ),
    );

    const missing = results.filter((r) => r.source === 'missing');
    const lowRes = results.filter((r) => r.lowRes);
    console.log(
        `\nDone: ${results.length - missing.length}/${results.length} logos written to public/presets.`,
    );
    if (lowRes.length)
        console.log(
            `Low resolution (replace if blurry): ${lowRes.map((r) => r.slug).join(', ')}`,
        );
    if (missing.length)
        console.log(
            `Missing (add a file to scripts/logos/sources): ${missing.map((r) => r.slug).join(', ')}`,
        );
    console.log(
        `Review: ${path.relative(ROOT, path.join(REVIEW_DIR, 'contact-sheet.png'))}`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
