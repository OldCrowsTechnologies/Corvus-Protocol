/**
 * Board geometry — a 6×4 isometric-styled grid ("The Hollow Roots").
 * Coordinates are a normalized 0..1 space; the renderer and the sim both scale by board size.
 * Path winds from the top-left breach to the altar (bottom-right), matching UI reference screen 10.
 */
import type { Vec2 } from './types';

export const GRID_COLS = 6;
export const GRID_ROWS = 4;

/** Logical board size the sim runs in (px). Spec tower ranges (~180-250 on 1080) scale by this. */
export const BOARD = 300;
export const RANGE_SCALE = BOARD / 1080; // spec px → logical px

function tileCenter(col: number, row: number): Vec2 {
  return { x: (col - 0.5) / GRID_COLS, y: (row - 0.5) / GRID_ROWS };
}

/** [col,row] path tiles (1-indexed), in walk order, ending at the altar. */
const PATH_TILES: Array<[number, number]> = [
  [1, 1],
  [2, 1],
  [2, 2],
  [3, 2],
  [4, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [6, 4], // altar
];

export const PATH: Vec2[] = PATH_TILES.map(([c, r]) => tileCenter(c, r));
export const ALTAR: Vec2 = PATH[PATH.length - 1];

/** Buildable tiles = every grid tile that isn't on the path/altar. */
export const BUILDABLE: Vec2[] = (() => {
  const pathKey = new Set(PATH_TILES.map(([c, r]) => `${c},${r}`));
  const out: Vec2[] = [];
  for (let r = 1; r <= GRID_ROWS; r++) {
    for (let c = 1; c <= GRID_COLS; c++) {
      if (!pathKey.has(`${c},${r}`)) out.push(tileCenter(c, r));
    }
  }
  return out;
})();

/** Cumulative segment lengths for constant-speed movement along the normalized path. */
const SEGMENTS = (() => {
  const segs: { from: Vec2; to: Vec2; len: number; acc: number }[] = [];
  let acc = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const from = PATH[i];
    const to = PATH[i + 1];
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    segs.push({ from, to, len, acc });
    acc += len;
  }
  return { segs, total: acc };
})();

export const PATH_LENGTH = SEGMENTS.total;

/** Position (normalized) at path progress t in 0..1. */
export function pointAt(t: number): Vec2 {
  const clamped = Math.max(0, Math.min(1, t));
  const target = clamped * SEGMENTS.total;
  for (const s of SEGMENTS.segs) {
    if (target <= s.acc + s.len || s === SEGMENTS.segs[SEGMENTS.segs.length - 1]) {
      const local = s.len === 0 ? 0 : (target - s.acc) / s.len;
      return {
        x: s.from.x + (s.to.x - s.from.x) * local,
        y: s.from.y + (s.to.y - s.from.y) * local,
      };
    }
  }
  return ALTAR;
}

/** Snap a normalized tap to the nearest buildable tile; null if none close enough. */
export function snapToBuildable(nx: number, ny: number, occupied: Vec2[]): Vec2 | null {
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (const tile of BUILDABLE) {
    if (occupied.some((o) => Math.abs(o.x - tile.x) < 0.001 && Math.abs(o.y - tile.y) < 0.001)) {
      continue;
    }
    const d = Math.hypot(tile.x - nx, tile.y - ny);
    if (d < bestD) {
      bestD = d;
      best = tile;
    }
  }
  // accept within ~half a tile
  return bestD < 0.13 ? best : null;
}
