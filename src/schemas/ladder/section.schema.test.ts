import { createContactElement } from "./element.schema";
import Section from "./section.schema";

describe("Section", () => {
	describe("isEmpty", () => {
		it("est vrai pour une section sans élément", () => {
			expect(new Section("s1", "Réseau").isEmpty()).toBe(true);
		});

		it("est faux dès que la section porte un élément", () => {
			const section = new Section("s1", "Réseau");
			section.elements.push(createContactElement("A", "NO", 0, 0));
			expect(section.isEmpty()).toBe(false);
		});
	});
});
