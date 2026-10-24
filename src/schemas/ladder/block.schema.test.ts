import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
	getArithmeticBlockParams,
	getAssignBlockParams,
	getCompareBlockParams,
	createConvertBlockElement,
	getConvertBlockFunctionName,
	getConvertBlockOutTypes,
	withConvertBlockInType,
} from "./block.schema";

describe("createUserProgramBlockElement", () => {
	it("pose un bloc d'appel de programme à la position donnée", () => {
		const block = createUserProgramBlockElement("prog1", 2, 3);

		expect(block.type).toBe("block");
		expect(block.data).toEqual({
			blockType: "user-program",
			params: { programId: "prog1" },
		});
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
		const block = createCompareBlockElement(2, 3, {
			in1: "A",
			in2: "B",
			operator: ">",
		});

		expect(block.type).toBe("block");
		expect(block.data).toEqual({
			blockType: "compare",
			params: { in1: "A", in2: "B", operator: ">" },
		});
		expect(block.position.row).toBe(2);
		expect(block.position.col).toBe(3);
		expect(block.id).toBeTruthy();
	});

	it("sans params : pinoches vides et opérateur = par défaut", () => {
		const block = createCompareBlockElement(0, 0);
		expect(getCompareBlockParams(block)).toEqual({
			in1: "",
			in2: "",
			operator: "=",
		});
	});
});

describe("getCompareBlockParams", () => {
	it("renvoie la config d'un bloc compare", () => {
		const block = createCompareBlockElement(0, 0, {
			in1: "A",
			in2: "B",
			operator: ">",
		});
		expect(getCompareBlockParams(block)).toEqual({
			in1: "A",
			in2: "B",
			operator: ">",
		});
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		const block = createUserProgramBlockElement("prog1", 0, 0);
		expect(getCompareBlockParams(block)).toBeNull();
	});
});

describe("createAssignBlockElement", () => {
	it("pose un bloc assign à la position donnée, avec les params fournis", () => {
		const block = createAssignBlockElement(2, 3, { out: "A", in: "B" });

		expect(block.type).toBe("block");
		expect(block.data).toEqual({
			blockType: "assign",
			params: { out: "A", in: "B" },
		});
		expect(block.position.row).toBe(2);
		expect(block.position.col).toBe(3);
		expect(block.id).toBeTruthy();
	});

	it("sans params : pinoches vides", () => {
		const block = createAssignBlockElement(0, 0);
		expect(getAssignBlockParams(block)).toEqual({ out: "", in: "" });
	});
});

describe("getAssignBlockParams", () => {
	it("renvoie la config d'un bloc assign", () => {
		const block = createAssignBlockElement(0, 0, { out: "A", in: "B" });
		expect(getAssignBlockParams(block)).toEqual({ out: "A", in: "B" });
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		const block = createUserProgramBlockElement("prog1", 0, 0);
		expect(getAssignBlockParams(block)).toBeNull();
	});
});

describe("createArithmeticBlockElement", () => {
	it("pose un bloc arithmetic avec les params fournis", () => {
		const block = createArithmeticBlockElement(2, 3, {
			in1: "A",
			in2: "B",
			out: "C",
			operator: "*",
		});
		expect(block.data).toEqual({
			blockType: "arithmetic",
			params: { in1: "A", in2: "B", out: "C", operator: "*" },
		});
		expect(block.position).toEqual({ row: 2, col: 3 });
	});

	it("sans params : pinoches vides et opérateur +", () => {
		const block = createArithmeticBlockElement(0, 0);
		expect(getArithmeticBlockParams(block)).toEqual({
			in1: "",
			in2: "",
			out: "",
			operator: "+",
		});
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		expect(
			getArithmeticBlockParams(createUserProgramBlockElement("p", 0, 0)),
		).toBeNull();
	});
});

describe("createConvertBlockElement", () => {
	it("starts on INT to REAL with empty pins", () => {
		expect(createConvertBlockElement(0, 0).data).toEqual({
			blockType: "convert",
			params: { in: "", out: "", inType: "INT", outType: "REAL" },
		});
	});
});

describe("getConvertBlockFunctionName", () => {
	it("names the conversion after the two chosen types", () => {
		expect(
			getConvertBlockFunctionName({
				in: "",
				out: "",
				inType: "DINT",
				outType: "INT",
			}),
		).toBe("DINT_TO_INT");
	});
});

describe("getConvertBlockOutTypes", () => {
	it("excludes the source type itself", () => {
		expect(getConvertBlockOutTypes("INT")).toEqual([
			"DINT",
			"WORD",
			"DWORD",
			"REAL",
		]);
	});

	it("excludes bit strings for a REAL source and REAL for a bit string source", () => {
		expect(getConvertBlockOutTypes("REAL")).toEqual(["INT", "DINT"]);
		expect(getConvertBlockOutTypes("WORD")).toEqual(["INT", "DINT", "DWORD"]);
	});
});

describe("withConvertBlockInType", () => {
	const params = { in: "a", out: "b", inType: "INT", outType: "REAL" } as const;

	it("keeps the target type when it stays a supported conversion", () => {
		expect(withConvertBlockInType(params, "DINT")).toEqual({
			...params,
			inType: "DINT",
		});
	});

	it("falls back to the first supported target when the current one is no longer valid", () => {
		expect(withConvertBlockInType(params, "REAL")).toEqual({
			...params,
			inType: "REAL",
			outType: "INT",
		});
		expect(withConvertBlockInType(params, "WORD")).toEqual({
			...params,
			inType: "WORD",
			outType: "INT",
		});
	});

	it("keeps the pins untouched, even with a variable of another type", () => {
		const next = withConvertBlockInType(params, "WORD");
		expect([next.in, next.out]).toEqual(["a", "b"]);
	});
});
