/**
 * @description Methods for objects manipulation
 * @author Vivian NKOUANANG (https://github.com/vporel) <dev.vporel@gmail.com>
 */

/**
 * @description Invert a record, the keys become values and the values become keys
 */
export function invertRecord<K extends string, V extends string>(record: Record<K, V>): Record<V, K> {
	return Object.fromEntries(Object.entries(record).map(([k, v]) => [v, k])) as Record<V, K>;
}

/**
 * @description Merge two objects deeply, the source object will override the target object
 */
export function deepMerge<TargetType = any, SourceType = any>(
	target: TargetType,
	source: SourceType,
	options?: { onlyExistingKeys?: boolean },
): TargetType {
	if (!source) return target;
	const _target: any = target;
	const _source: any = source;
	for (const key in _source) {
		if ((target as object).hasOwnProperty(key) || !options?.onlyExistingKeys) {
			if (
				typeof _source[key] === "object" &&
				_source[key] !== null &&
				!Array.isArray(_source[key])
			) {
				if (!_target[key]) _target[key] = {};
				deepMerge(_target[key], _source[key]);
			} else {
				_target[key] = _source[key];
			}
		}
	}
	return _target;
}

/**
 * @description Extract an object from another object using a list of keys
 */
export function extractFields<T = object>(keys: string[], sourceObject: any | undefined | null): T {
	const extractedObject: any = {};
	for (const key of keys) extractedObject[key] = sourceObject ? sourceObject[key] : "";
	return extractedObject as T;
}

/**
 * @description Get an array with the object keys joined by dots
 * @param obj
 * @returns
 */
export function getKeysDeepJoined(obj: object, separator: string = "."): string[] {
	const list = [];
	for (const key in obj) {
		if ((obj as any)[key] == null || typeof (obj as any)[key] != "object") list.push(key);
		else {
			const nestedObjectKeysJoined = getKeysDeepJoined((obj as any)[key]);
			for (const key2 of nestedObjectKeysJoined) list.push(key + separator + key2);
		}
	}
	return list;
}

/**
 * @description Deep comparison of two objects
 */
export function deepObjectsComparison(obj1: any, obj2: any): boolean {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
}
