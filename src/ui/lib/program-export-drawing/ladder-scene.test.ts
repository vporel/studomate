import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import {
	createSectionWith,
	wireInSeries,
} from "@tests/utils/ladder-factory";
import { createRandomId } from "@/ids";
import { sceneToSvg } from "./backends/svg-backend";
import ladderToSectionScenes, { connectionVertices } from "./ladder-scene";

describe("connectionVertices", () => {
	it("relie droit un rung horizontal (même ligne)", () => {
		expect(connectionVertices([70, 100], [600, 100], undefined)).toEqual([
			[70, 100],
			[600, 100],
		]);
	});

	it("interprète data.points comme [ligne, quartCol] et prend l'ordonnée de la source/cible", () => {
		// quartCol 8 → x = POWER_RAIL_OFFSET(10) + 8*15 = 130 ; ordonnées = source puis cible.
		const v = connectionVertices([70, 100], [600, 200], [
			[0, 8],
			[2, 8],
		]);
		expect(v).toEqual([
			[70, 100],
			[130, 100],
			[130, 200],
			[600, 200],
		]);
	});
});

function twoSectionLadder(): Ladder {
	const rail1 = createRailTerminalElement(0);
	const c1 = createContactElement("start", "NO", 0, 0);
	const k1 = createCoilElement("motor", "normal", 0, 1);
	const s1 = createSectionWith(
		[rail1, c1, k1],
		wireInSeries([rail1, c1, k1]),
		createRandomId(),
		"Démarrage",
	);

	const rail2 = createRailTerminalElement(0);
	const c2 = createContactElement("motor", "NF", 0, 0);
	const k2 = createCoilElement("lamp", "set", 0, 1);
	const s2 = createSectionWith(
		[rail2, c2, k2],
		wireInSeries([rail2, c2, k2]),
		createRandomId(),
		"Voyant",
	);

	return new Ladder(createRandomId(), "L", [s1, s2]);
}

describe("ladderToSectionScenes", () => {
	it("produit une scène par section avec son intitulé", () => {
		const scenes = ladderToSectionScenes(twoSectionLadder());
		expect(scenes.map((s) => s.heading)).toEqual([
			"Section 1 : Démarrage",
			"Section 2 : Voyant",
		]);
		for (const s of scenes) {
			expect(s.scene.width).toBeGreaterThan(0);
			expect(s.scene.height).toBeGreaterThan(0);
		}
	});

	it("intitule une section sans titre « Section N »", () => {
		const empty = new Ladder(createRandomId(), "L", [
			createSectionWith([], [], createRandomId(), ""),
		]);
		expect(ladderToSectionScenes(empty)[0].heading).toBe("Section 1");
	});

	it("dessine le rail vertical, le contact NF diagonal et les arcs de bobine", () => {
		const [section1, section2] = ladderToSectionScenes(twoSectionLadder());
		const verticalRail = section1.scene.ops.filter(
			(o) => o.op === "line" && o.x1 === o.x2 && Math.abs(o.y2 - o.y1) > 20,
		);
		expect(verticalRail.length).toBeGreaterThanOrEqual(1);
		const diagonals = section2.scene.ops.filter(
			(o) => o.op === "line" && o.x1 !== o.x2 && o.y1 !== o.y2,
		);
		expect(diagonals.length).toBeGreaterThanOrEqual(1);
		expect(section2.scene.ops.filter((o) => o.op === "path")).toHaveLength(2);
	});

	it("sérialise chaque section en SVG (snapshot)", () => {
		const svg = ladderToSectionScenes(twoSectionLadder())
			.map((s) => `<!-- ${s.heading} -->\n${sceneToSvg(s.scene)}`)
			.join("\n\n");
		expect(svg).toMatchSnapshot();
	});
});
