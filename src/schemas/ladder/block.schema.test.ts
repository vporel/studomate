import {
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
	getAssignBlockParams,
	getCompareBlockParams,
} from "./block.schema";

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

describe("createCompareBlockElement", () => {
	it("pose un bloc compare à la position donnée, sans nom", () => {
		const block = createCompareBlockElement({ expression: "A > B" }, 2, 3);

		expect(block.type).toBe("block");
		expect(block.data).toEqual({ blockType: "compare", params: { expression: "A > B" } });
		expect(block.position.row).toBe(2);
		expect(block.position.col).toBe(3);
		expect(block.id).toBeTruthy();
	});
});

describe("getCompareBlockParams", () => {
	it("renvoie la config d'un bloc compare", () => {
		const block = createCompareBlockElement({ expression: "A > B" }, 0, 0);
		expect(getCompareBlockParams(block)).toEqual({ expression: "A > B" });
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		const block = createUserProgramBlockElement("prog1", 0, 0);
		expect(getCompareBlockParams(block)).toBeNull();
	});
});

describe("createAssignBlockElement", () => {
	it("pose un bloc assign à la position donnée, sans nom", () => {
		const block = createAssignBlockElement({ expression: "A := B" }, 2, 3);

		expect(block.type).toBe("block");
		expect(block.data).toEqual({ blockType: "assign", params: { expression: "A := B" } });
		expect(block.position.row).toBe(2);
		expect(block.position.col).toBe(3);
		expect(block.id).toBeTruthy();
	});
});

describe("getAssignBlockParams", () => {
	it("renvoie la config d'un bloc assign", () => {
		const block = createAssignBlockElement({ expression: "A := B" }, 0, 0);
		expect(getAssignBlockParams(block)).toEqual({ expression: "A := B" });
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		const block = createUserProgramBlockElement("prog1", 0, 0);
		expect(getAssignBlockParams(block)).toBeNull();
	});
});
