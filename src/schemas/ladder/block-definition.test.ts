import { createCounterBlockElement } from "./function-blocks/counter.schema";
import { createTimerBlockElement } from "./function-blocks/timer.schema";
import {
	BLOCK_DEFINITIONS,
	getBlockElementHeight,
	getBlockElementWidth,
	resolvePortSpecs,
	resolveStructuralPorts,
} from "./block-definition";
import { BLOCK_TYPES, BlockData, BlockType } from "./block.schema";

/** Un `BlockData` par défaut pour chaque famille, tel que produit à la dépose. */
function defaultData(blockType: BlockType): BlockData {
	switch (blockType) {
		case "user-program":
			return { blockType, params: { programId: "p1" } };
		case "timer":
			return createTimerBlockElement(
				{ name: "T1", timerType: "TON", pt: "T#1s" },
				0,
				0,
			).data;
		case "counter":
			return createCounterBlockElement(
				{ name: "C1", counterType: "CTU", control: "R1", pv: "5" },
				0,
				0,
			).data;
		case "compare":
			return { blockType, params: { in1: "", in2: "", operator: "=" } };
		case "assign":
			return { blockType, params: { out: "", in: "" } };
		case "arithmetic":
			return { blockType, params: { in1: "", in2: "", out: "", operator: "+" } };
	}
}

describe("BLOCK_DEFINITIONS", () => {
	it("a une entrée par type de bloc", () => {
		expect(Object.keys(BLOCK_DEFINITIONS).sort()).toEqual([...BLOCK_TYPES].sort());
	});

	it.each(BLOCK_TYPES)("%s : specs de ports cohérentes", (blockType) => {
		const specs = resolvePortSpecs(defaultData(blockType));
		expect(specs.length).toBeGreaterThan(0);
		expect(
			specs.filter((s) => s.kind === "structural" && s.direction === "input"),
		).toHaveLength(1);
		expect(
			specs.filter((s) => s.kind === "structural" && s.direction === "output"),
		).toHaveLength(1);
	});

	it("largeur en colonnes : 1 pour compare, 2 pour les autres", () => {
		expect(getBlockElementWidth(defaultData("compare"))).toBe(1);
		for (const blockType of BLOCK_TYPES) {
			if (blockType === "compare") continue;
			expect(getBlockElementWidth(defaultData(blockType))).toBe(2);
		}
	});

	it("hauteur en cellules par famille", () => {
		expect(getBlockElementHeight(defaultData("user-program"))).toBe(1);
		expect(getBlockElementHeight(defaultData("compare"))).toBe(1);
		expect(getBlockElementHeight(defaultData("timer"))).toBe(2);
		expect(getBlockElementHeight(defaultData("counter"))).toBe(2);
		expect(getBlockElementHeight(defaultData("assign"))).toBe(2);
		expect(getBlockElementHeight(defaultData("arithmetic"))).toBe(2);
	});

	it("resolveStructuralPorts : EN/ENO pour user-program/assign/arithmetic, IN/Q pour timer/counter/compare", () => {
		expect(resolveStructuralPorts(defaultData("user-program"))).toEqual({
			input: "EN",
			output: "ENO",
		});
		expect(resolveStructuralPorts(defaultData("assign"))).toEqual({
			input: "EN",
			output: "ENO",
		});
		expect(resolveStructuralPorts(defaultData("timer"))).toEqual({
			input: "IN",
			output: "Q",
		});
		expect(resolveStructuralPorts(defaultData("compare"))).toEqual({
			input: "IN",
			output: "Q",
		});
	});

	it("resolveStructuralPorts : CD/Q pour un compteur CTD", () => {
		const ctd = createCounterBlockElement(
			{ name: "C2", counterType: "CTD", control: "LD1", pv: "3" },
			0,
			0,
		).data;
		expect(resolveStructuralPorts(ctd)).toEqual({ input: "CD", output: "Q" });
	});

	describe("readParam / writeParam", () => {
		it("timer : round-trip PT/ET", () => {
			const def = BLOCK_DEFINITIONS.timer;
			let params = defaultData("timer").params;
			params = def.writeParam(params, "PT", "T#2s");
			params = def.writeParam(params, "ET", "SortieET");
			expect(def.readParam(params, "PT")).toBe("T#2s");
			expect(def.readParam(params, "ET")).toBe("SortieET");
		});

		it("counter : round-trip PV/CV/contrôle", () => {
			const def = BLOCK_DEFINITIONS.counter;
			let params = defaultData("counter").params;
			params = def.writeParam(params, "PV", "12");
			params = def.writeParam(params, "CV", "cv");
			params = def.writeParam(params, "R", "reset");
			expect(def.readParam(params, "PV")).toBe("12");
			expect(def.readParam(params, "CV")).toBe("cv");
			expect(def.readParam(params, "R")).toBe("reset");
		});

		it("assign : round-trip IN/OUT", () => {
			const def = BLOCK_DEFINITIONS.assign;
			let params = defaultData("assign").params;
			params = def.writeParam(params, "IN", "A");
			params = def.writeParam(params, "OUT", "B");
			expect(def.readParam(params, "IN")).toBe("A");
			expect(def.readParam(params, "OUT")).toBe("B");
		});

		it("arithmetic : round-trip IN1/IN2/OUT + opérateur", () => {
			const def = BLOCK_DEFINITIONS.arithmetic;
			let params = defaultData("arithmetic").params;
			params = def.writeParam(params, "IN1", "X");
			params = def.writeParam(params, "IN2", "Y");
			params = def.writeParam(params, "OUT", "Z");
			expect(def.readParam(params, "IN1")).toBe("X");
			expect(def.readParam(params, "IN2")).toBe("Y");
			expect(def.readParam(params, "OUT")).toBe("Z");

			params = def.operator!.write(params, "*");
			expect(def.operator!.read(params)).toBe("*");
		});

		it("compare / user-program : lèvent (pas de pinoche paramètre éditable)", () => {
			expect(() =>
				BLOCK_DEFINITIONS.compare.readParam(defaultData("compare").params, "X"),
			).toThrow();
			expect(() =>
				BLOCK_DEFINITIONS["user-program"].readParam(
					defaultData("user-program").params,
					"X",
				),
			).toThrow();
		});
	});
});
