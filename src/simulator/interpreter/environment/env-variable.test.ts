import EnvVariable from "@/simulator/interpreter/environment/env-variable";
import IllegalVariableValueTypeException from "@/simulator/interpreter/environment/exceptions/illegal-variable-value-type.exception";

describe("EnvVariable", () => {
	it("initializes default values depending on type", () => {
		const n = new EnvVariable("id1", "n", "number", "IN");
		expect(n.getValue()).toBe(0);
		const s = new EnvVariable("id2", "s", "string", "IN");
		expect(s.getValue()).toBe("");
		const b = new EnvVariable("id3", "b", "boolean", "IN");
		expect(b.getValue()).toBe(false);
	});

	it("accepts valid typed values and rejects invalid ones", () => {
		const v = new EnvVariable("id", "v", "number", "IN");
		v.setValue(42);
		expect(v.getValue()).toBe(42);
		expect(() => v.setValue("nope" as any)).toThrow(
			IllegalVariableValueTypeException,
		);
	});

	it("ramène toute valeur écrite dans le domaine numérique du type (INT qui déborde → repli)", () => {
		const v = new EnvVariable("id", "pos", "number", "INOUT", {
			min: -32768,
			max: 32767,
			integer: true,
			wrap: true,
		});
		v.setValue(30000);
		expect(v.getValue()).toBe(30000);
		v.setValue(40000);
		expect(v.getValue()).toBe(40000 - 65536);
		v.setValue(12.9);
		expect(v.getValue()).toBe(12);
	});

	it("ne borne pas quand aucun domaine n'est fourni (REAL, TIME…)", () => {
		const v = new EnvVariable("id", "r", "number", "INOUT");
		v.setValue(1e9);
		expect(v.getValue()).toBe(1e9);
	});
});
