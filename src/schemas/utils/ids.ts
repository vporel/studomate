import { nanoid } from "nanoid";

/**
 * Generate a random id of the given size (default 15)
 */
export function createRandomId(size: number = 15): string {
	return nanoid(size);
}
