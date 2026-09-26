import {
	arithmeticResultType,
	constantFits,
	isConstantOutOfRange,
	isImplicitlyAssignable,
	numericTypeOfDeclaredType,
	unifyNumericTypes,
} from "./numeric-typing";

describe("numeric-typing", () => {
	it("numericTypeOfDeclaredType : type automate numérique, ANY_NUM sinon", () => {
		expect(numericTypeOfDeclaredType("DINT")).toBe("DINT");
		expect(numericTypeOfDeclaredType("TIME")).toBe("TIME");
		expect(numericTypeOfDeclaredType(null)).toBe("ANY_NUM");
		expect(numericTypeOfDeclaredType("BOOL")).toBe("ANY_NUM");
	});

	describe("unifyNumericTypes", () => {
		it("élargit sans perte : INT vers DINT et REAL, WORD vers DWORD", () => {
			expect(unifyNumericTypes({ type: "INT" }, { type: "DINT" })).toBe("DINT");
			expect(unifyNumericTypes({ type: "REAL" }, { type: "INT" })).toBe("REAL");
			expect(unifyNumericTypes({ type: "WORD" }, { type: "DWORD" })).toBe("DWORD");
		});

		it("refuse DINT avec REAL et un entier avec une chaîne de bits", () => {
			expect(unifyNumericTypes({ type: "DINT" }, { type: "REAL" })).toBeNull();
			expect(unifyNumericTypes({ type: "INT" }, { type: "WORD" })).toBeNull();
		});

		it("une constante prend le type de l'autre opérande si elle y tient", () => {
			expect(unifyNumericTypes({ type: "INT" }, { type: "ANY_INT", value: 100 })).toBe(
				"INT",
			);
			expect(
				unifyNumericTypes({ type: "ANY_INT", value: 40000 }, { type: "INT" }),
			).toBeNull();
			expect(unifyNumericTypes({ type: "INT" }, { type: "ANY_REAL" })).toBeNull();
			expect(unifyNumericTypes({ type: "REAL" }, { type: "ANY_INT" })).toBe("REAL");
		});

		it("deux constantes restent des constantes", () => {
			expect(unifyNumericTypes({ type: "ANY_INT" }, { type: "ANY_INT" })).toBe(
				"ANY_INT",
			);
			expect(unifyNumericTypes({ type: "ANY_INT" }, { type: "ANY_REAL" })).toBe(
				"ANY_REAL",
			);
		});

		it("une variable sans type déclaré échappe aux règles", () => {
			expect(unifyNumericTypes({ type: "ANY_NUM" }, { type: "WORD" })).toBe(
				"ANY_NUM",
			);
		});
	});

	describe("arithmeticResultType", () => {
		it("le résultat a le type commun des opérandes", () => {
			expect(arithmeticResultType("*", { type: "INT" }, { type: "ANY_INT" })).toBe(
				"INT",
			);
			expect(arithmeticResultType("+", { type: "INT" }, { type: "DINT" })).toBe(
				"DINT",
			);
		});

		it("TIME : seulement TIME ± TIME, TIME * n et TIME / n", () => {
			expect(arithmeticResultType("+", { type: "TIME" }, { type: "TIME" })).toBe(
				"TIME",
			);
			expect(arithmeticResultType("*", { type: "TIME" }, { type: "ANY_INT" })).toBe(
				"TIME",
			);
			expect(arithmeticResultType("/", { type: "TIME" }, { type: "REAL" })).toBe(
				"TIME",
			);
			expect(
				arithmeticResultType("+", { type: "TIME" }, { type: "ANY_INT" }),
			).toBeNull();
			expect(arithmeticResultType("*", { type: "INT" }, { type: "TIME" })).toBeNull();
			expect(arithmeticResultType("*", { type: "TIME" }, { type: "TIME" })).toBeNull();
		});
	});

	describe("constantes", () => {
		it("constantFits contrôle le genre et la plage du type cible", () => {
			expect(constantFits({ type: "ANY_INT", value: 32767 }, "INT")).toBe(true);
			expect(constantFits({ type: "ANY_INT", value: 32768 }, "INT")).toBe(false);
			expect(constantFits({ type: "ANY_INT", value: -1 }, "WORD")).toBe(false);
			expect(constantFits({ type: "ANY_INT" }, "TIME")).toBe(false);
			expect(constantFits({ type: "ANY_REAL", value: 1.5 }, "DINT")).toBe(false);
		});

		it("isConstantOutOfRange distingue la plage du genre", () => {
			expect(isConstantOutOfRange({ type: "ANY_INT", value: 40000 }, "INT")).toBe(
				true,
			);
			expect(isConstantOutOfRange({ type: "ANY_REAL", value: 1.5 }, "INT")).toBe(
				false,
			);
		});
	});

	describe("isImplicitlyAssignable", () => {
		it("accepte le même type, un élargissement ou une constante qui tient", () => {
			expect(isImplicitlyAssignable({ type: "INT" }, "INT")).toBe(true);
			expect(isImplicitlyAssignable({ type: "INT" }, "DINT")).toBe(true);
			expect(isImplicitlyAssignable({ type: "INT" }, "REAL")).toBe(true);
			expect(isImplicitlyAssignable({ type: "ANY_INT", value: 5 }, "WORD")).toBe(
				true,
			);
		});

		it("refuse un rétrécissement", () => {
			expect(isImplicitlyAssignable({ type: "DINT" }, "INT")).toBe(false);
			expect(isImplicitlyAssignable({ type: "REAL" }, "INT")).toBe(false);
			expect(isImplicitlyAssignable({ type: "DINT" }, "REAL")).toBe(false);
			expect(isImplicitlyAssignable({ type: "WORD" }, "INT")).toBe(false);
		});
	});
});
