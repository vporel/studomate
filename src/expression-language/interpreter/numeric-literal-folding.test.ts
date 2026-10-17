import { foldNumberLiterals } from "./numeric-literal-folding";

const int = (value: number) => ({ value, kind: "integer" as const });
const real = (value: number) => ({ value, kind: "real" as const });

describe("foldNumberLiterals", () => {
	it("divise deux entiers en tronquant vers zéro, le résultat reste entier", () => {
		expect(foldNumberLiterals("/", int(7), int(2))).toEqual(int(3));
		expect(foldNumberLiterals("/", int(-7), int(2))).toEqual(int(-3));
	});

	it("donne un réel dès qu'un opérande est réel", () => {
		expect(foldNumberLiterals("/", real(7), int(2))).toEqual(real(3.5));
		expect(foldNumberLiterals("*", int(2), real(1.5))).toEqual(real(3));
	});

	it("calcule addition, soustraction et multiplication entre entiers", () => {
		expect(foldNumberLiterals("+", int(2), int(3))).toEqual(int(5));
		expect(foldNumberLiterals("-", int(2), int(3))).toEqual(int(-1));
		expect(foldNumberLiterals("*", int(4), int(3))).toEqual(int(12));
	});

	it("ne replie pas une constante TIME ni une division par zéro", () => {
		expect(
			foldNumberLiterals("+", { value: 1000, kind: "time" }, int(2)),
		).toBeNull();
		expect(foldNumberLiterals("/", int(1), int(0))).toBeNull();
	});
});
