import Ladder from "../ladder.schema";
import SectionAddCommand from "./section-add.command";

describe("SectionAddCommand", () => {
	it("ajoute une section sans aucun élément ni connexion, et l'annulation la retire", () => {
		const ladder = new Ladder("l1", "L");

		const command = new SectionAddCommand({ sectionId: "s2", title: "Titre", description: "Description" });
		command.execute(ladder);

		const section = ladder.getSection("s2");
		expect(section).toMatchObject({ title: "Titre", description: "Description" });
		expect(section?.elements).toEqual([]);
		expect(section?.connections).toEqual([]);

		command.cancel(ladder);
		expect(ladder.getSection("s2")).toBeUndefined();
	});

	it("échoue si l'id de section existe déjà", () => {
		const ladder = new Ladder("l1", "L");
		const [existing] = ladder.sections;
		const command = new SectionAddCommand({ sectionId: existing.id, title: "T", description: "" });
		expect(command.execute(ladder)[1]).toBe(false);
	});
});
