import {
	getConversionFunctionName,
	isConversionSupported,
	parseConversionFunctionName,
} from "./conversions";

describe("conversions", () => {
	describe("isConversionSupported", () => {
		it("accepte les conversions entre entiers, réels et chaînes de bits définies par la norme", () => {
			expect(isConversionSupported("DINT", "INT")).toBe(true);
			expect(isConversionSupported("INT", "REAL")).toBe(true);
			expect(isConversionSupported("REAL", "DINT")).toBe(true);
			expect(isConversionSupported("WORD", "INT")).toBe(true);
			expect(isConversionSupported("DINT", "DWORD")).toBe(true);
			expect(isConversionSupported("DWORD", "WORD")).toBe(true);
		});

		it("refuse une conversion vers le même type", () => {
			expect(isConversionSupported("INT", "INT")).toBe(false);
		});

		it("refuse les conversions entre réel et chaîne de bits", () => {
			expect(isConversionSupported("REAL", "WORD")).toBe(false);
			expect(isConversionSupported("DWORD", "REAL")).toBe(false);
		});
	});

	describe("parseConversionFunctionName", () => {
		it("reconnaît un nom de la norme, sans tenir compte de la casse", () => {
			expect(parseConversionFunctionName("DINT_TO_INT")).toEqual({
				source: "DINT",
				target: "INT",
			});
			expect(parseConversionFunctionName("int_to_real")).toEqual({
				source: "INT",
				target: "REAL",
			});
		});

		it("renvoie null pour un type inconnu, une conversion non prise en charge ou un autre nom", () => {
			expect(parseConversionFunctionName("BOOL_TO_INT")).toBeNull();
			expect(parseConversionFunctionName("REAL_TO_WORD")).toBeNull();
			expect(parseConversionFunctionName("INT_TO_INT")).toBeNull();
			expect(parseConversionFunctionName("moteur")).toBeNull();
		});
	});

	it("getConversionFunctionName construit le nom normalisé", () => {
		expect(getConversionFunctionName("WORD", "DINT")).toBe("WORD_TO_DINT");
	});
});
