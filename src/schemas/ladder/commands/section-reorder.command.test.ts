import Ladder from "../ladder.schema";
import SectionReorderCommand from "./section-reorder.command";

describe("SectionReorderCommand", () => {
	it("réordonne les sections puis annule vers l'ordre précédent", () => {
		const ladder = new Ladder("l1", "L");
		const [first] = ladder.sections;
		const second = ladder.createSection("B");
		const previousOrder = ladder.sections.map((s) => s.id);

		const command = new SectionReorderCommand({
			orderedSectionIds: [second.id, first.id],
			previousOrderedSectionIds: previousOrder,
		});
		command.execute(ladder);
		expect(ladder.sections.map((s) => s.id)).toEqual([second.id, first.id]);

		command.cancel(ladder);
		expect(ladder.sections.map((s) => s.id)).toEqual(previousOrder);
	});
});
