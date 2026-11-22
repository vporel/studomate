/** Ramène `value` dans `[min, max]`. Si les bornes sont inversées (`min > max`), `min` l'emporte. */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Linear interpolation between `from` and `to`; the ratio is not clamped. */
export function lerp(from: number, to: number, ratio: number): number {
	return from + (to - from) * ratio;
}
