import { Dialect } from "@/expression-language/dialect.enum";
import {
	createArithmeticBlockElement,
	createCompareBlockElement,
} from "@/schemas/ladder/block.schema";
import {
	LadderElement,
	createContactElement,
	createCoilElement,
} from "@/schemas/ladder/element.schema";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import collectLadderReferences from "./ladder-references";
import { RawReference } from "./cross-reference.types";

function ladderWith(...elements: LadderElement[]): Ladder {
	const section = new Section("sec-1", "Comptage", "", elements, []);
	return new Ladder("lad-1", "Ladder 1", [section]);
}

function find(
	refs: RawReference[],
	variableName: string,
): RawReference[] {
	return refs.filter((ref) => ref.variableName === variableName);
}

describe("collectLadderReferences", () => {
	it("relève un contact en lecture et une bobine en écriture", () => {
		const ladder = ladderWith(
			createContactElement("Dcy", "NO", 0, 0),
			createCoilElement("Moteur", "normal", 0, 3),
		);
		const refs = collectLadderReferences(ladder, Dialect.FR);

		expect(find(refs, "Dcy")).toEqual([
			expect.objectContaining({ access: "read", locationKind: "ladder-contact" }),
		]);
		expect(find(refs, "Moteur")).toEqual([
			expect.objectContaining({ access: "write", locationKind: "ladder-coil" }),
		]);
	});

	it("traite un contact P comme une simple lecture (pas de variable source)", () => {
		const ladder = ladderWith(createContactElement("Front", "P", 0, 0));
		const refs = collectLadderReferences(ladder, Dialect.FR);
		expect(refs).toEqual([
			expect.objectContaining({ variableName: "Front", access: "read" }),
		]);
	});

	it("lit les opérandes variables d'un bloc compare, ignore les littéraux", () => {
		const ladder = ladderWith(
			createCompareBlockElement(0, 1, { in1: "Niveau", in2: "10", operator: ">" }),
		);
		const refs = collectLadderReferences(ladder, Dialect.FR);
		expect(find(refs, "Niveau")).toEqual([
			expect.objectContaining({ access: "read", locationKind: "ladder-block-pin" }),
		]);
		expect(find(refs, "10")).toEqual([]);
	});

	it("lit les entrées et écrit la sortie d'un bloc arithmetic", () => {
		const ladder = ladderWith(
			createArithmeticBlockElement(0, 1, {
				in1: "A",
				in2: "B",
				out: "Somme",
				operator: "+",
			}),
		);
		const refs = collectLadderReferences(ladder, Dialect.FR);
		expect(find(refs, "A")[0].access).toBe("read");
		expect(find(refs, "B")[0].access).toBe("read");
		expect(find(refs, "Somme")[0].access).toBe("write");
	});

	it("lit PT/ET variables d'un timer et écrit ses variables exposées", () => {
		const ladder = ladderWith(
			createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "Consigne", et: "Ecoule" },
				0,
				1,
			),
		);
		const refs = collectLadderReferences(ladder, Dialect.FR);
		expect(find(refs, "Consigne")[0].access).toBe("read");
		expect(find(refs, "Ecoule")[0].access).toBe("write");
		expect(find(refs, "Tempo1.Q")).toEqual([
			expect.objectContaining({ access: "write" }),
		]);
		expect(find(refs, "Tempo1.ET")).toEqual([
			expect.objectContaining({ access: "write" }),
		]);
	});

	it("résout les pinoches variantes d'un compteur CTD (CD/LD)", () => {
		const ladder = ladderWith(
			createCounterBlockElement(
				{ name: "Cpt", counterType: "CTD", control: "Charge", pv: "Preset", cv: "Courant" },
				0,
				1,
			),
		);
		const refs = collectLadderReferences(ladder, Dialect.FR);
		expect(find(refs, "Charge")[0].access).toBe("read");
		expect(find(refs, "Preset")[0].access).toBe("read");
		expect(find(refs, "Courant")[0].access).toBe("write");
		expect(find(refs, "Cpt.Q")[0].access).toBe("write");
	});

	it("porte le titre de section et la ligne de grille dans locationParams", () => {
		const ladder = ladderWith(createContactElement("Dcy", "NO", 2, 0));
		const [ref] = collectLadderReferences(ladder, Dialect.FR);
		expect(ref.locationParams).toMatchObject({
			sectionTitle: "Comptage",
			gridRow: 2,
		});
	});
});
