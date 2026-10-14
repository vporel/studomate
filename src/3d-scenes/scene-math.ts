/** Linear interpolation between `from` and `to`; the ratio is not clamped. */
export function mix(from: number, to: number, ratio: number): number {
	return from + (to - from) * ratio;
}

/** Restricts `value` to the `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
