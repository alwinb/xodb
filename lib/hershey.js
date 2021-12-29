const log = console.log.bind (console)
import fontData from '../resources/hershey-occidental.js'

function* range (a, z = Infinity)
  { while (a <= z) yield a++ }

// Hershey Fonts
// =============

// This file implements messy, ugly glyph mappings for the hersy-occidental
// font data. This is used to map a codepoint (for now, no ligatures and diacritics)
// to the actual glyph data. 

// TODO clean this up, compress the font data and build a radix tree
// for fast indexing, I think; should be fun.

// ### Additional 'glyphs'

// Additional glyphs for space, zero-width–space, and a missing-glyph–glyph. 
// For the latter I'm using a copy of the bell icon (glyph 869 in hershey-occidental).
// TODO adjust space 'characters' for each 'font'

// const ht  = { bbox: [[0,0],[0,0]], left:-6, lines: [], right: 6, vertices:0 }
const sp   = { bbox: [[0,0],[0,0]], left:-3, lines: [], right: 3, vertices:0 }
const zwsp = { bbox: [[0,0],[0,0]], left: 0, lines: [], right: 0, vertices:0 }
const missing = {
  bbox:[[-11,-12],[11,10]],
  charcode:869,
  left:-11,
  lines:[[[-2,-9],[-2,-11],[-1,-12],[1,-12],[2,-11],[2,-9]],[[-11,8],[-10,6],[-8,4],[-7,2],[-6,-2],[-6,-7],[-5,-8],[-3,-9],[3,-9],[5,-8],[6,-7],[6,-2],[7,2],[8,4],[10,6],[11,8]],[[-11,8],[11,8]],[[-1,8],[-2,9],[-1,10],[1,10],[2,9],[1,8]]],
  right:11,
  vertices:33
}

// ### 'Font'

// These now are based on a 'glyphMap', being an array mapping codepoint => glyph
// with glyphMap[0] being the glyph for U+32 (SPACE). 

// Oh boy what a mess I made with ugly hacks here :S

const codeTable = { '0':sp, '-1':zwsp, NaN:missing }
for (let g of fontData) codeTable [g.charcode] = g

function Font (obj) {
  const { glyphMap } = obj
  obj.em = obj.ascender + obj.descender
  obj.toGlyph = c => {
    if (typeof c === 'string') c = c.codePointAt (0)
    let g = glyphMap [c - 32]
    g = (g == null || Number.isNaN(g)) ? missing : codeTable[g]
    return g
  }
  return obj
}


// ### Glyph Mappings

const ___ = NaN

const SansSmall = Font ({
  name: 'SansSmall',
  baseline:5, ascender:11, descender:1,
  glyphMap: [
    0,   214, 217, 233, 219, ___, 234, 216, 221, 222, 228, 225, 211, 224, 210, 220,
    ...range(0, 9), 212, 213, ___, 226, ___, 215,
    ___, ...range(1, 26), ___, ___, ___, ___, ___,
    ___, ...range(1, 26), ___, 223, ___, ___, ___ // NB Maps lowercase ASCII to uppercase glyphs
  ]
})

const Sans = Font ({
  name: 'Sans',
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0,   714, 717, 733, 719, ___, 734, 716, 721, 722, 728, 725, 711, 724, 710, 720,
    ...range(700, 709), 712, 713, ___, 726, ___, 715,
    ___, ...range(501, 526), ___, ___, ___, ___, ___,
    ___, ...range(601, 626), ___, 723, ___, ___, ___,
  ]
})

const Script = Font ({
  name: 'Script',
  baseline:10, ascender:23, descender:12,
  glyphMap: [
    0,   714, 717, 733, 719, ___, 734, 716, 721, 722, 728, 725, 711, 724, 710, 720,
    ...range(700, 709), 712, 713, ___, 726, ___, 715,
    ___, ...range(551, 576), ___, ___, ___, ___, ___,
    ___, ...range(651, 676), ___, 723, ___, ___, ___,
  ]
})

const SansBold = Font ({
  name: 'SansBold',
  baseline:10, ascender: 23, descender:10,
  glyphMap: [
    0, 2714, 2728, ___, 2719, ___, 2718, 2727, 2721, 2722, 2723, 2725, 2711, 2724, 2710, 2720,
    ...range(2700, 2709), 2712, 2713, ___, 2726, ___, 2715,
    ___, ...range(2501, 2526), ___, ___, ___, ___, ___,
    ___, ...range(2601, 2626), ___, ___, ___, ___, ___,
  ]
})

const ScriptBold = Font ({
  name: 'ScriptBold',
  baseline:10, ascender: 23, descender:12,
  glyphMap: [
    0, 2764, 2778, ___, 2769, ___, 2768, 2777, 2771, 2772, 2773, 2775, 2761, 2774, 2760, 2770,
    ...range(2750, 2759), 2762, 2763, ___, 2776,  ___, 2765,
    ___, ...range(2551, 2576), ___, ___, ___, ___, ___,
    ___, ...range(2651, 2676), ___, ___, ___, ___, ___,
  ]
})

const RomanSmall = Font ({
  name: 'RomanSmall',
  baseline:7, ascender:15, descender:4,
  glyphMap: [
    0, 2214, 2217, 2275, 2274, 2271, 2272, 2216, 2221, 2222, 2219, 2232, 2211, 2231, 2210, 2220,
    ...range(1200, 1209), 1212, 1213, 1241, 1238, 1242, 1215,
    1273, ...range(1001, 1026), 1223,  ___, 1224,  ___,  ___,
    1249, ...range(1101, 1126), 1225, 1229, 1226, 1246,  ___,
  ]
})

const RomanSmallItalic = Font ({ // Only A-Z a-z, otherwise uses RomanSmall
  name: 'RomanSmallItalic',
  baseline:7, ascender:15, descender:4,
  glyphMap: [
    0, 2214, 2217, 2275, 2274, 2271, 2272, 2216, 2221, 2222, 2219, 2232, 2211, 2231, 2210, 2220,
    ...range(1200, 1209), 1212, 1213, 1241, 1238, 1242, 1215,
    1273, ...range(1051, 1076), 1223,  ___, 1224,  ___,  ___,
    1249, ...range(1151, 1176), 1225, 1229, 1226, 1246,  ___,
  ]
})

const Roman = Font ({
  name: 'Roman',
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0, 2214, 2217, 2275, 2274, 2271, 2272, 2216, 2221, 2222, 2219, 2232, 2211, 2231, 2210, 2220,
    ...range(2200, 2209), 2212, 2213, 2241, 2238, 2242, 2215,
     ___, ...range(2001, 2026), 2223,  ___, 2224,  ___,  ___,
    2249, ...range(2101, 2126), 2225, 2229, 2226, 2246,  ___,
  ]
})

const RomanItalic = Font ({ // Only A-Z a-z, otherwise uses RomanSmall
  name: 'RomanItalic',
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0, 2214, 2217, 2275, 2274, 2271, 2272, 2216, 2221, 2222, 2219, 2232, 2211, 2231, 2210, 2220,
    ...range(2200, 2209), 2212, 2213, 2241, 2238, 2242, 2215,
     ___, ...range(2051, 2076), 2223,  ___, 2224,  ___,  ___,
    2249, ...range(2151, 2176), 2225, 2229, 2226, 2246,  ___,
  ]
})

const RomanBold = Font ({ // TODO check ASCII symbols
  name: 'RomanBold',
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0, 3214, 3217, 3275, 3274, 3271, 3272, 3216, 3221, 3222, 3219, 3232, 3211, 3231, 3210, 3220,
    ...range(3200, 3209), 3212, 3213, 3241, 3238, 3242, 3215,
     ___, ...range(3001, 3026), 3223,  ___, 3224,  ___,  ___,
    3249, ...range(3101, 3126), 3225, 3229, 3226, 3246,  ___,
  ]
})

const RomanBoldItalic = Font ({ // TODO check ASCII symbols
  name: 'RomanBoldItalic',
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0, 3214, 3217, 3275, 3274, 3271, 3272, 3216, 3221, 3222, 3219, 3232, 3211, 3231, 3210, 3220,
    ...range(3250, 3259), 3212, 3213, 3241, 3238, 3242, 3215,
     ___, ...range(3051, 3076), 3223,  ___, 3224,  ___,  ___,
    3249, ...range(3151, 3176), 3225, 3229, 3226, 3246,  ___,
  ]
})

const Fractur = Font ({
  name: 'Fractur', // German Gothic
  baseline:10, ascender:23, descender:5,
  glyphMap: [
    0, 3714, 3728,  ___, 3719, ___, 3718, 3727, 3721, 3722, 3723, 3725, 3711, 3724, 2710, 3720,
    ...range(3700, 3709), 3712, 3713, ___, 3726, ___, 3715,
     ___, ...range(3301, 3326), ___, ___, ___, ___, ___,
    3249, ...range(3401, 3426), ___, ___, ___, ___, ___,
  ]
})

const Textur = Font ({
  name: 'Textur', // English Gothic
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0, 3714, 3728,  ___, 3719, ___, 3718, 3727, 3721, 3722, 3723, 3725, 3711, 3724, 2710, 3720,
    ...range(3700, 3709), 3712, 3713, ___, 3726, ___, 3715,
     ___, ...range(3501, 3526), ___, ___, ___, ___, ___,
    3249, ...range(3601, 3626), ___, ___, ___, ___, ___,
  ]
})

const Lombard = Font ({
  name: 'Lombard', // English Gothic
  baseline:10, ascender:23, descender:7,
  glyphMap: [
    0, 3714, 3728,  ___, 3719, ___, 3718, 3727, 3721, 3722, 3723, 3725, 3711, 3724, 2710, 3720,
    ...range(3700, 3709), 3712, 3713, ___, 3726, ___, 3715,
     ___, ...range(3801, 3826), ___, ___, ___, ___, ___,
    3249, ...range(3901, 3926), ___, ___, ___, ___, ___,
  ]
})


// Exports
// -------

export { 
  SansSmall,
  Sans,
  Script,
  SansBold,
  ScriptBold,
  RomanSmall,
  RomanSmallItalic,
  Roman,
  RomanItalic,
  RomanBold,
  RomanBoldItalic,
  Fractur,
  Textur,
  Lombard,
}