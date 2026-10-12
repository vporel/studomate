/**
 * Version of the firmware shipped with Studomate (`firmwares/arduino/uno-r3-remote-io`). A board
 * reporting an older version is offered an update. Keep in sync with `FIRMWARE_VERSION` of the
 * sketch: `firmware-version.test.ts` checks the sketch and the precompiled `.hex`.
 */
export const SHIPPED_FIRMWARE_VERSION = "1.0.0";

/** Dotted numeric versions compared field by field; missing fields count as 0. */
export function compareVersions(a: string, b: string): number {
	const left = a.split(".").map(Number);
	const right = b.split(".").map(Number);
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		const difference = (left[i] ?? 0) - (right[i] ?? 0);
		if (difference !== 0) return Math.sign(difference);
	}
	return 0;
}

/** True when `found` is older than `shipped`, or is not a version at all. */
export function isFirmwareOutdated(
	found: string,
	shipped = SHIPPED_FIRMWARE_VERSION,
): boolean {
	if (!/^\d+(\.\d+)*$/.test(found)) return true;
	return compareVersions(found, shipped) < 0;
}
