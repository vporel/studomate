import { createCoilElement, createContactElement, getElementHeight } from "./element.schema";
import { createUserProgramBlockElement } from "./block.schema";
import { createTimerBlockElement } from "../function-blocks/timer.schema";

describe("ladder element factories", () => {
	it("createContactElement pose un contact à la position donnée", () => {
		const contact = createContactElement("A", "NF", 2, 3);

		expect(contact.type).toBe("contact");
		expect(contact.data.variable).toBe("A");
		expect(contact.data.mode).toBe("NF");
		expect(contact.position.row).toBe(2);
		expect(contact.position.col).toBe(3);
		expect(contact.id).toBeTruthy();
	});

	it("createCoilElement pose une bobine à la position donnée", () => {
		const coil = createCoilElement("Q1", "set", 1, 0);

		expect(coil.type).toBe("coil");
		expect(coil.data.variable).toBe("Q1");
		expect(coil.data.mode).toBe("set");
		expect(coil.position.row).toBe(1);
		expect(coil.position.col).toBe(0);
	});

	it("chaque élément créé a un id distinct", () => {
		const a = createContactElement("A", "NO", 0, 0);
		const b = createContactElement("A", "NO", 0, 0);
		expect(a.id).not.toBe(b.id);
	});

	describe("getElementHeight", () => {
		it("vaut 1 pour un contact, une bobine ou un bloc user-program", () => {
			expect(getElementHeight(createContactElement("A", "NO", 0, 0))).toBe(1);
			expect(getElementHeight(createCoilElement("Q1", "normal", 0, 0))).toBe(1);
			expect(getElementHeight(createUserProgramBlockElement("prog1", 0, 0))).toBe(1);
		});

		it("vaut 2 pour un bloc timer", () => {
			const block = createTimerBlockElement({ name: "Tempo1", timerType: "TON", pt: "T#5s" }, 0, 0);
			expect(getElementHeight(block)).toBe(2);
		});
	});
});
