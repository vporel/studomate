import Ladder from "../ladder.schema";
import SectionUpdateCommand from "./section-update.command";

describe("SectionUpdateCommand", () => {
	it("met à jour titre/description puis annule vers les valeurs précédentes", () => {
		const ladder = new Ladder("l1", "L");
		const [section] = ladder.sections;

		const command = new SectionUpdateCommand({
			sectionId: section.id,
			title: "Nouveau titre",
			description: "Nouvelle description",
			previousTitle: section.title,
			previousDescription: section.description,
		});
		command.execute(ladder);
		expect(section.title).toBe("Nouveau titre");
		expect(section.description).toBe("Nouvelle description");

		command.cancel(ladder);
		expect(section.title).toBe("");
		expect(section.description).toBe("");
	});
});
