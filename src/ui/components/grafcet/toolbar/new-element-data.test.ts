import { GRAFCET_ELEMENT_CLASSES } from "@/ui/utils/grafcet/grafcet-element-classes";
import newElementData from "./new-element-data";

describe("newElementData", () => {
	it("écrit le texte donné dans un nouveau commentaire", () => {
		expect(
			newElementData(
				{ type: "comment" },
				GRAFCET_ELEMENT_CLASSES.comment,
				"Comment",
			),
		).toEqual({ text: "Comment" });
	});

	it("crée une étape initiale ou non selon l'outil", () => {
		const data = newElementData(
			{ type: "step", extraData: { initial: true } },
			GRAFCET_ELEMENT_CLASSES.step,
			"Comment",
		);
		expect(data).toMatchObject({ initial: true });
	});

	it("laisse les autres éléments avec leurs données par défaut", () => {
		expect(
			newElementData(
				{ type: "transition" },
				GRAFCET_ELEMENT_CLASSES.transition,
				"Comment",
			),
		).toEqual(GRAFCET_ELEMENT_CLASSES.transition.generateDefaultData());
	});
});
