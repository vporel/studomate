import { createUserProgramBlockElement } from "./block.schema";

describe("createUserProgramBlockElement", () => {
	it("pose un bloc d'appel de programme à la position donnée", () => {
		const block = createUserProgramBlockElement("prog1", 2, 3);

		expect(block.type).toBe("block");
		expect(block.data).toEqual({ blockType: "user-program", params: { programId: "prog1" } });
		expect(block.position.row).toBe(2);
		expect(block.position.col).toBe(3);
		expect(block.id).toBeTruthy();
	});

	it("chaque bloc créé a un id distinct", () => {
		const a = createUserProgramBlockElement("prog1", 0, 0);
		const b = createUserProgramBlockElement("prog1", 0, 0);
		expect(a.id).not.toBe(b.id);
	});
});
