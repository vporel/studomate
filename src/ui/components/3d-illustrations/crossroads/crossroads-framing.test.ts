import { CAMERA_FOV, cameraDistance, FILL } from "./crossroads-framing";

const BASE = 7.2;
const halfHeight = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
/** Visible extents at the target, in world units, for a canvas of the given size. */
const visible = (width: number, height: number) => {
	const distance = cameraDistance(BASE, width, height);
	const h = 2 * distance * halfHeight;
	return { w: (h * width) / height, h };
};

describe("cameraDistance", () => {
	it("recule la caméra quand la zone se rétrécit en largeur", () => {
		expect(cameraDistance(BASE, 600, 1000)).toBeGreaterThan(
			cameraDistance(BASE, 1200, 1000),
		);
	});

	it("laisse de l'air autour du socle sur une zone étroite : la largeur limite", () => {
		const { w } = visible(600, 1000);
		const framedWidth = BASE * Math.SQRT2 * 0.99;
		expect(framedWidth / w).toBeLessThanOrEqual(FILL);
		expect(framedWidth / w).toBeGreaterThan(FILL * 0.9);
	});

	it("ne dépend plus de la largeur sur une zone très large : la hauteur limite", () => {
		expect(cameraDistance(BASE, 3000, 1000)).toBeCloseTo(
			cameraDistance(BASE, 4000, 1000),
		);
	});

	it("tient compte de la taille du socle", () => {
		expect(cameraDistance(2 * BASE, 600, 1000)).toBeCloseTo(
			2 * cameraDistance(BASE, 600, 1000),
		);
	});
});
