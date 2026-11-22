/**
 * Vector drawing IR for export (PDF, image). A renderer produces a `Scene` (list of `DrawOp` and
 * the dimensions of the cropped bounding box); a backend renders it as PDF (jsPDF primitives) or as
 * an SVG string. Coordinates in logical pixels, origin at the top left.
 */

/** A number in a `path` op's `d`, exponent notation included (`1e-7`, as produced by
 * `String(number)`). */
export const PATH_NUMBER_PATTERN = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?`;

/** Motif de pointillés `[longueur trait, longueur trou]`, en pixels. */
export type Dash = [number, number];

export type DrawOp =
	| {
			op: "rect";
			x: number;
			y: number;
			w: number;
			h: number;
			/** Rayon des coins ; 0 ou absent = coins droits. */
			rx?: number;
			stroke?: string;
			strokeWidth?: number;
			fill?: string;
			dash?: Dash;
	  }
	| {
			op: "line";
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			stroke?: string;
			strokeWidth?: number;
			dash?: Dash;
	  }
	| {
			op: "polyline";
			points: [number, number][];
			stroke?: string;
			strokeWidth?: number;
			fill?: string;
			dash?: Dash;
			/** Ferme le tracé (relie le dernier point au premier). */
			closed?: boolean;
	  }
	| {
			op: "circle";
			cx: number;
			cy: number;
			r: number;
			stroke?: string;
			strokeWidth?: number;
			fill?: string;
	  }
	| {
			op: "text";
			x: number;
			y: number;
			text: string;
			fontSize: number;
			align?: "left" | "center" | "right";
			/** Ancrage vertical de `y` ; défaut `alphabetic`. */
			baseline?: "top" | "middle" | "alphabetic";
			bold?: boolean;
			color?: string;
	  }
	| {
			op: "path";
			/** Sous-ensemble `M`/`L`/`C`/`Z` uniquement (coordonnées absolues). */
			d: string;
			stroke?: string;
			strokeWidth?: number;
			fill?: string;
	  };

export type Scene = {
	ops: DrawOp[];
	width: number;
	height: number;
};

export const DEFAULT_STROKE = "#000000";
export const DEFAULT_STROKE_WIDTH = 2;
/** Famille de police alignée sur la `helvetica` intégrée de jsPDF. */
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";
