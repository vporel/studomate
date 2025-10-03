/**
 * Deep comparison of two objects.
 * @param obj1
 * @param obj2
 * @returns
 */
export function deepObjectsComparison(obj1: any, obj2: any): boolean {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
}
