/**
 * @description Methods for objects manipulation
 * @author Vivian NKOUANANG (https://github.com/vporel) <dev.vporel@gmail.com>
 */

/**
 * @description Invert a record, the keys become values and the values become keys
 */
export function invertRecord<K extends string, V extends string>(
	record: Record<K, V>,
): Record<V, K> {
	return Object.fromEntries(
		Object.entries(record).map(([k, v]) => [v, k]),
	) as Record<V, K>;
}

/**
 * @description Extract an object from another object using a list of keys
 */
export function extractFields<T = object>(
	keys: string[],
	sourceObject: any | undefined | null,
): T {
	const extractedObject: any = {};
	for (const key of keys)
		extractedObject[key] = sourceObject ? sourceObject[key] : "";
	return extractedObject as T;
}

/**
 * @description Deep comparison of two objects
 *
 * Descente récursive plutôt qu'une comparaison par sérialisation JSON : insensible à l'ordre des
 * clés, traite `NaN` comme égal à lui-même, et court-circuite dès la première différence trouvée
 * — déterminant pour les appelants qui comparent un domaine entier juste après qu'il vient d'être
 * modifié, où une différence est la norme plutôt que l'exception.
 */
export function deepObjectsComparison(obj1: any, obj2: any): boolean {
	if (obj1 === obj2) return true;
	if (
		typeof obj1 !== "object" ||
		typeof obj2 !== "object" ||
		obj1 === null ||
		obj2 === null
	) {
		return Number.isNaN(obj1) && Number.isNaN(obj2);
	}
	if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
	if (Array.isArray(obj1)) {
		if (obj1.length !== obj2.length) return false;
		return obj1.every((value, index) =>
			deepObjectsComparison(value, obj2[index]),
		);
	}
	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);
	if (keys1.length !== keys2.length) return false;
	return keys1.every(
		(key) =>
			Object.hasOwn(obj2, key) && deepObjectsComparison(obj1[key], obj2[key]),
	);
}
