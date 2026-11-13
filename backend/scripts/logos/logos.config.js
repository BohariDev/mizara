'use strict';

/**
 * Where to find the logo for each payment preset, keyed by preset slug.
 *
 * - simpleIcon: slug in the `simple-icons` package (https://simpleicons.org).
 *   Rendered as a white glyph on the brand color. Used before the website.
 * - domain: the brand's website, used to download its app icon.
 *
 * A file in scripts/logos/sources/<slug>.(png|jpg|jpeg|webp|svg) always wins
 * over both, so drop a file there to replace a bad downloaded logo.
 */
module.exports = {
    // Streaming
    netflix: { simpleIcon: 'netflix', domain: 'netflix.com' },
    spotify: { simpleIcon: 'spotify', domain: 'spotify.com' },
    'youtube-premium': { simpleIcon: 'youtube', domain: 'youtube.com' },
    'disney-plus': { domain: 'disneyplus.com' },
    'hbo-max': { simpleIcon: 'hbomax', domain: 'hbomax.com' },
    'prime-video': { domain: 'primevideo.com' },
    'apple-music': { simpleIcon: 'applemusic', domain: 'music.apple.com' },
    viu: { domain: 'viu.com' },
    iwanttfc: { domain: 'iwanttfc.com' },
    crunchyroll: { simpleIcon: 'crunchyroll', domain: 'crunchyroll.com' },

    // Software & Subscriptions
    icloud: { simpleIcon: 'icloud', domain: 'icloud.com' },
    'google-one': { domain: 'one.google.com' },
    'microsoft-365': { domain: 'microsoft365.com' },
    'chatgpt-plus': { domain: 'chatgpt.com' },
    'claude-pro': { simpleIcon: 'claude', domain: 'claude.ai' },
    'canva-pro': { domain: 'canva.com' },
    'adobe-creative-cloud': { domain: 'adobe.com' },
    notion: { simpleIcon: 'notion', domain: 'notion.com' },

    // Entertainment
    'playstation-plus': {
        simpleIcon: 'playstation',
        domain: 'playstation.com',
    },
    'xbox-game-pass': { domain: 'xbox.com' },
    'nintendo-switch-online': { domain: 'nintendo.com' },

    // Utilities
    meralco: { domain: 'meralco.com.ph' },
    maynilad: { domain: 'mayniladwater.com.ph' },
    'manila-water': { domain: 'manilawater.com' },
    'pldt-home': { domain: 'pldthome.com' },
    'globe-at-home': { domain: 'globe.com.ph' },
    converge: { domain: 'convergeict.com' },
    'sky-fiber': { domain: 'mysky.com.ph' },
    'globe-postpaid': { domain: 'globe.com.ph' },
    'smart-postpaid': { domain: 'smart.com.ph' },
    'dito-postpaid': { domain: 'dito.ph' },
    cepalco: { domain: 'cepalco.com.ph' },
    'cagayan-de-oro-water-district': { domain: 'cowd.gov.ph' },

    // Government contributions
    sss: { domain: 'sss.gov.ph' },
    philhealth: { domain: 'philhealth.gov.ph' },
    'pag-ibig': { domain: 'pagibigfund.gov.ph' },

    // Health & Fitness
    'anytime-fitness': { domain: 'anytimefitness.com' },
};
