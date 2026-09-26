/** Ramène `value` dans `[min, max]`. Si les bornes sont inversées (`min > max`), `min` l'emporte. */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
