"use client";

/**
 * Generate an array of numbers from start to end (the last number is excluded)
 * @param start The start number
 * @param end The end number
 */
export function range(start: number, end: number): number[] {
	const arr = [];
	for (let i = start; i < end; i++) arr.push(i);
	return arr;
}
