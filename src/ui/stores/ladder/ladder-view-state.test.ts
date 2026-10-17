import Ladder from "@/schemas/ladder/ladder.schema";
import {
	createCoilElement,
	createContactElement,
} from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import syncLadderViewState from "./ladder-view-state";

function makeSection(id: string): Section {
	const section = new Section(id, id);
	section.elements = [
		createContactElement("A", "NO", 0, 0),
		createCoilElement("Q1", "normal", 0, 1),
	];
	return section;
}

function makeLadder(...sections: Section[]): Ladder {
	const ladder = new Ladder("l", "L");
	ladder.sections = sections;
	return ladder;
}

const emptyView = {
	nodesBySectionId: {},
	edgesBySectionId: {},
	activeSectionId: null,
	selectedSectionIds: [] as string[],
};

describe("syncLadderViewState", () => {
	it("adopte le ladder et crée nodes/edges pour chaque section, y compris nouvelle", () => {
		const ladder = makeLadder(makeSection("s1"), makeSection("s2"));

		const result = syncLadderViewState(emptyView, ladder);

		expect(result.ladder).toBe(ladder);
		expect(Object.keys(result.nodesBySectionId)).toEqual(["s1", "s2"]);
		expect(Object.keys(result.edgesBySectionId)).toEqual(["s1", "s2"]);
		expect(result.nodesBySectionId.s1.map((n) => n.type)).toEqual([
			"contact",
			"coil",
			"railTerminal",
		]);
	});

	it("retire les nodes/edges d'une section supprimée", () => {
		const first = syncLadderViewState(
			emptyView,
			makeLadder(makeSection("s1"), makeSection("s2")),
		);

		const result = syncLadderViewState(first, makeLadder(makeSection("s2")));

		expect(Object.keys(result.nodesBySectionId)).toEqual(["s2"]);
		expect(Object.keys(result.edgesBySectionId)).toEqual(["s2"]);
	});

	it("conserve l'identité des nodes d'une section inchangée", () => {
		const ladder = makeLadder(makeSection("s1"));
		const first = syncLadderViewState(emptyView, ladder);

		const result = syncLadderViewState(first, ladder);

		expect(result.nodesBySectionId.s1[0]).toBe(first.nodesBySectionId.s1[0]);
	});

	it("garde la section active si elle existe encore", () => {
		const ladder = makeLadder(makeSection("s1"));

		const result = syncLadderViewState(
			{ ...emptyView, activeSectionId: "s1" },
			ladder,
		);

		expect(result.activeSectionId).toBe("s1");
	});

	it.each(["gone", null])(
		"remet activeSectionId à null quand il vaut %s",
		(active) => {
			const result = syncLadderViewState(
				{ ...emptyView, activeSectionId: active },
				makeLadder(makeSection("s1")),
			);

			expect(result.activeSectionId).toBeNull();
		},
	);

	it("conserve la même référence de selectedSectionIds si rien n'est élagué", () => {
		const selected = ["s1"];

		const result = syncLadderViewState(
			{ ...emptyView, selectedSectionIds: selected },
			makeLadder(makeSection("s1")),
		);

		expect(result.selectedSectionIds).toBe(selected);
	});

	it("élague les sections sélectionnées qui ont disparu", () => {
		const result = syncLadderViewState(
			{ ...emptyView, selectedSectionIds: ["s1", "gone"] },
			makeLadder(makeSection("s1")),
		);

		expect(result.selectedSectionIds).toEqual(["s1"]);
	});
});
