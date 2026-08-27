import EnvVariable from "./env-variable";
import { Environment } from "./environment";
import UnknownVariableIdException from "./exceptions/unknown-variable-id.exception";
import UnknownVariableNameException from "./exceptions/unknown-variable-name.exception";

describe("Environment", () => {
	let env: Environment;
	let var1: EnvVariable;
	let var2: EnvVariable;

	beforeEach(() => {
		var1 = new EnvVariable("id1", "varA", "number", "IN");
		var1.setValue(42);
		var2 = new EnvVariable("id2", "varB", "boolean", "OUT");
		var2.setValue(true);
		env = new Environment([var1, var2]);
	});

	describe("existsVariableWithId", () => {
		it("returns true for existing variable", () => {
			expect(env.existsVariableWithId("id1")).toBe(true);
		});

		it("returns false for non-existing variable", () => {
			expect(env.existsVariableWithId("unknown")).toBe(false);
		});
	});

	describe("existsVariableWithName", () => {
		it("returns true for existing variable", () => {
			expect(env.existsVariableWithName("varA")).toBe(true);
		});

		it("returns false for non-existing variable", () => {
			expect(env.existsVariableWithName("unknown")).toBe(false);
		});
	});

	describe("getVariableTypeById", () => {
		it("returns correct type", () => {
			expect(env.getVariableTypeById("id1")).toBe("number");
			expect(env.getVariableTypeById("id2")).toBe("boolean");
		});

		it("throws on unknown id", () => {
			expect(() => env.getVariableTypeById("unknown")).toThrow(
				UnknownVariableIdException,
			);
		});
	});

	describe("getVariableTypeByName", () => {
		it("returns correct type", () => {
			expect(env.getVariableTypeByName("varA")).toBe("number");
			expect(env.getVariableTypeByName("varB")).toBe("boolean");
		});

		it("throws on unknown name", () => {
			expect(() => env.getVariableTypeByName("unknown")).toThrow(
				UnknownVariableNameException,
			);
		});
	});

	describe("getVariableDirectionById", () => {
		it("returns correct direction", () => {
			expect(env.getVariableDirectionById("id1")).toBe("IN");
			expect(env.getVariableDirectionById("id2")).toBe("OUT");
		});
	});

	describe("getVariableValueById", () => {
		it("returns correct value", () => {
			expect(env.getVariableValueById("id1")).toBe(42);
			expect(env.getVariableValueById("id2")).toBe(true);
		});
	});

	describe("getVariableValueByName", () => {
		it("returns correct value", () => {
			expect(env.getVariableValueByName("varA")).toBe(42);
			expect(env.getVariableValueByName("varB")).toBe(true);
		});
	});

	describe("setVariableValueById", () => {
		it("updates variable value", () => {
			env.setVariableValueById("id1", 100);
			expect(env.getVariableValueById("id1")).toBe(100);
		});

		it("throws on type mismatch", () => {
			expect(() => env.setVariableValueById("id1", "wrong" as any)).toThrow();
		});
	});

	describe("setVariableValueByName", () => {
		it("updates variable value", () => {
			env.setVariableValueByName("varA", 200);
			expect(env.getVariableValueByName("varA")).toBe(200);
		});
	});

	describe("forçage de variables", () => {
		it("setVariableValueById est ignoré pour une variable forcée", () => {
			const forcedEnv = new Environment([var1, var2], new Set(["id1"]));
			forcedEnv.setVariableValueById("id1", 999);
			expect(forcedEnv.getVariableValueById("id1")).toBe(42);
		});

		it("setVariableValueByName est ignoré pour une variable forcée", () => {
			const forcedEnv = new Environment([var1, var2], new Set(["id1"]));
			forcedEnv.setVariableValueByName("varA", 999);
			expect(forcedEnv.getVariableValueByName("varA")).toBe(42);
		});

		it("les lectures restent possibles sur une variable forcée", () => {
			const forcedEnv = new Environment([var1, var2], new Set(["id1"]));
			expect(forcedEnv.getVariableValueById("id1")).toBe(42);
			expect(forcedEnv.getVariableValueByName("varA")).toBe(42);
		});

		it("une variable non forcée reste modifiable", () => {
			const forcedEnv = new Environment([var1, var2], new Set(["id1"]));
			forcedEnv.setVariableValueById("id2", false);
			expect(forcedEnv.getVariableValueById("id2")).toBe(false);
		});

		it("sans forcedVariableIds, le comportement est identique à avant", () => {
			env.setVariableValueById("id1", 100);
			expect(env.getVariableValueById("id1")).toBe(100);
		});

		it("setForcedVariableIds applique une nouvelle table de forçage", () => {
			env.setForcedVariableIds(new Set(["id1"]));
			env.setVariableValueById("id1", 100);
			expect(env.getVariableValueById("id1")).toBe(42);
		});

		it("setForcedVariableIds peut relâcher une variable auparavant forcée", () => {
			const forcedEnv = new Environment([var1, var2], new Set(["id1"]));
			forcedEnv.setForcedVariableIds(new Set());
			forcedEnv.setVariableValueById("id1", 100);
			expect(forcedEnv.getVariableValueById("id1")).toBe(100);
		});
	});

	describe("hydrateVariableValue", () => {
		it("écrit la valeur même sur une variable forcée", () => {
			const forcedEnv = new Environment([var1, var2], new Set(["id1"]));
			forcedEnv.hydrateVariableValue("id1", 7);
			expect(forcedEnv.getVariableValueById("id1")).toBe(7);
		});

		it("conserve le contrôle de type", () => {
			expect(() => env.hydrateVariableValue("id1", "nope" as any)).toThrow();
		});

		it("lève sur un id inconnu", () => {
			expect(() => env.hydrateVariableValue("unknown", 1)).toThrow(
				UnknownVariableIdException,
			);
		});
	});
});
