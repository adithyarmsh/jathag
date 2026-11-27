// Background stars (step 0.3.7.2, D-117 item 4; amends D-065): random four-point stars instead of the
// tiled CSS dots. Pure functions, tested in stars.test.ts; drawn by app/star-field.tsx after the page
// has loaded (so every load differs and the server HTML never disagrees with the browser).
//
// Density: 38 stars per 320 × 320 px (D-140: about 35% more than the 28 of D-117; the old tile had 14 dots).
// Size: tip to tip, random from STAR_MIN to STAR_MAX (= 1.5 × STAR_MIN).
// Brightness follows size: opacity factor from 0.5 (smallest) to 1 (largest) × the theme's --star-strength;
// the colour is --star-colour (D-140: a lighter warm gold in light mode, the accent in dark).

export const STAR_TILE = 320;
export const STARS_PER_TILE = 38;
/** Smallest star, px tip to tip: 3.5 px (D-118; the largest is 5.25 px). */
export const STAR_MIN = 3.5;
/** Largest star = 1.5 × the smallest (D-117 item 4b). */
export const STAR_MAX = STAR_MIN * 1.5;
export const OPACITY_MIN = 0.5;
export const OPACITY_MAX = 1;

export interface Star {
  /** Centre, px from the page's top-left corner. */
  x: number;
  y: number;
  /** Tip to tip, px. */
  size: number;
  /** 0.5–1, multiplied with the theme's dust strength. Larger stars are brighter. */
  opacity: number;
}

/** A random number in [0, 1); Math.random in the browser, a fixed sequence in tests. */
export type Random = () => number;

/** How many stars an area gets (38 per 320 × 320 px, rounded). */
export function starCount(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 0;
  return Math.round((width * height * STARS_PER_TILE) / (STAR_TILE * STAR_TILE));
}

/** Random stars inside the rectangle [x0, x0 + width) × [y0, y0 + height). */
export function starsInRect(x0: number, y0: number, width: number, height: number, random: Random): Star[] {
  const out: Star[] = [];
  const n = starCount(width, height);
  for (let i = 0; i < n; i++) {
    const t = random(); // one draw sets both size and brightness, so brightness follows size
    out.push({
      x: x0 + random() * width,
      y: y0 + random() * height,
      size: STAR_MIN + t * (STAR_MAX - STAR_MIN),
      opacity: OPACITY_MIN + t * (OPACITY_MAX - OPACITY_MIN),
    });
  }
  return out;
}

export interface StarSky {
  /** The area already covered with stars. */
  width: number;
  height: number;
  stars: Star[];
}

export const emptySky: StarSky = { width: 0, height: 0, stars: [] };

/**
 * Grows the sky to cover width × height without moving any star already there (no visible jump when
 * the page gets taller after "See my chart" or a list opens, or the window gets wider): only the new
 * strip on the right and the new strip at the bottom get stars. When the page shrinks, the stars stay
 * and the drawing layer simply clips them.
 */
export function extendSky(sky: StarSky, width: number, height: number, random: Random): StarSky {
  const w = Math.max(sky.width, width);
  const h = Math.max(sky.height, height);
  if (w === sky.width && h === sky.height) return sky;
  const added = [
    ...starsInRect(sky.width, 0, w - sky.width, sky.height, random), // right strip, old height
    ...starsInRect(0, sky.height, w, h - sky.height, random), // bottom strip, full new width
  ];
  return { width: w, height: h, stars: [...sky.stars, ...added] };
}

/**
 * The four-point sparkle star (concave sides), centred on 0,0 with tips at ±1, as an SVG path. Drawn
 * once in a <symbol> and reused for every star.
 */
export const STAR_PATH = "M0,-1C0.1,-0.1 0.1,-0.1 1,0C0.1,0.1 0.1,0.1 0,1C-0.1,0.1 -0.1,0.1 -1,0C-0.1,-0.1 -0.1,-0.1 0,-1Z";
