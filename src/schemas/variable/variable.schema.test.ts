import Variable, { VariableZone, ZONES_TO_TYPES } from "./variable.schema";

describe("Variable", () => {
	describe("getDirection", () => {
		it.each([
			["logic-input", "IN"],
			["analog-input", "IN"],
			["logic-output", "OUT"],
			["analog-output", "OUT"],
			["memory", "INOUT"],
		] as [VariableZone, string][])(
			"zone %s → direction %s",
			(zone, expected) => {
				const variable = new Variable("id", "M", zone, ZONES_TO_TYPES[zone][0]);
				expect(variable.getDirection()).toBe(expected);
			},
		);
	});

	describe("constructor", () => {
		it("lève quand la variable est invalide", () => {
			expect(() => new Variable("id", "1bad", "memory", "BOOL")).toThrow();
		});
	});

	describe("update", () => {
		it("normalise le type en majuscules et trime l'adresse", () => {
			const variable = new Variable("id", "M", "memory", "BOOL");

			const updated = variable.update({
				type: "bool" as Variable["type"],
				address: " %I0.0 ",
			});

			expect(updated.type).toBe("BOOL");
			expect(updated.address).toBe("%I0.0");
		});

		it("retourne une nouvelle instance sans muter l'original", () => {
			const variable = new Variable("id", "M", "memory", "BOOL");

			const updated = variable.update({ mnemonic: "AUTRE" });

			expect(updated).not.toBe(variable);
			expect(updated.mnemonic).toBe("AUTRE");
			expect(variable.mnemonic).toBe("M");
		});

		it("lève sans muter l'instance quand le résultat serait invalide", () => {
			const variable = new Variable("id", "M", "logic-input", "BOOL");

			expect(() => variable.update({ type: "INT" })).toThrow();
			expect(variable.type).toBe("BOOL");
		});
	});

	describe("behavior", () => {
		it("vaut null à la création", () => {
			expect(new Variable("id", "BP", "logic-input", "BOOL").behavior).toBeNull();
		});

		it("s'applique via update quand il est valide pour la zone et le type", () => {
			const variable = new Variable("id", "BP", "logic-input", "BOOL");

			const updated = variable.update({ behavior: { kind: "push-button-nc", params: null } });

			expect(updated.behavior).toEqual({ kind: "push-button-nc", params: null });
			expect(variable.behavior).toBeNull();
		});

		it("fait lever update quand il est invalide", () => {
			const variable = new Variable("id", "M", "memory", "BOOL");

			expect(() =>
				variable.update({ behavior: { kind: "push-button-no", params: null } }),
			).toThrow();
		});

		it("est restitué par createFromJSON, et vaut null pour un projet sans ce champ", () => {
			const variable = new Variable("id", "niveau", "analog-input", "INT").update({
				behavior: { kind: "slider", params: { min: 0, max: 100 } },
			});
			const { behavior: _omitted, ...legacy } = JSON.parse(JSON.stringify(variable));

			expect(Variable.createFromJSON(JSON.stringify(variable)).behavior).toEqual({
				kind: "slider",
				params: { min: 0, max: 100 },
			});
			expect(Variable.createFromJSON(JSON.stringify(legacy)).behavior).toBeNull();
		});
	});

	describe("copy", () => {
		it("produit une instance indépendante de l'original", () => {
			const original = new Variable("id", "M", "memory", "BOOL");

			const copie = original.copy();
			copie.mnemonic = "AUTRE";

			expect(original.mnemonic).toBe("M");
			expect(copie).not.toBe(original);
		});
	});

	describe("createFromJSON", () => {
		it("restitue une vraie instance de Variable, pas un objet nu", () => {
			const original = new Variable("id1", "M", "memory", "BOOL");

			const restitué = Variable.createFromJSON(JSON.stringify(original));

			expect(restitué).toBeInstanceOf(Variable);
			expect(restitué.mnemonic).toBe("M");
			expect(typeof restitué.copy).toBe("function");
		});
	});

	describe("getNativeType", () => {
		it.each([
			["BOOL", "boolean"],
			["INT", "number"],
			["STRING", "string"],
		])("type %s → type natif %s", (type, expected) => {
			const variable = new Variable("id", "M", "memory", type as any);
			expect(variable.getNativeType()).toBe(expected);
		});
	});

	describe("getNumericRange", () => {
		it("borne INT sur 16 bits signés avec repli", () => {
			const v = new Variable("id", "M", "memory", "INT");
			expect(v.getNumericRange()).toEqual({
				min: -32768,
				max: 32767,
				integer: true,
				wrap: true,
			});
		});

		it("borne WORD sur 16 bits non signés", () => {
			const v = new Variable("id", "M", "memory", "WORD");
			expect(v.getNumericRange()).toMatchObject({ min: 0, max: 65535 });
		});

		it("ne contraint pas REAL, TIME, BOOL, STRING", () => {
			for (const type of ["REAL", "TIME", "BOOL", "STRING"] as const) {
				expect(
					new Variable("id", "M", "memory", type).getNumericRange(),
				).toBeNull();
			}
		});

		it("borne DINT sur 32 bits signés, avec repli", () => {
			expect(
				new Variable("id", "M", "memory", "DINT").getNumericRange(),
			).toEqual({
				min: -2147483648,
				max: 2147483647,
				integer: true,
				wrap: true,
			});
		});
	});

	describe("ownerBlock", () => {
		it("crée une variable de bloc avec un mnémonique pointé", () => {
			const variable = new Variable("id", "Tempo1.PT", "memory", "TIME", {
				id: "block1",
			});
			expect(variable.ownerBlock).toEqual({ id: "block1" });
			expect(variable.type).toBe("TIME");
		});

		it("n'a pas d'ownerBlock par défaut", () => {
			const variable = new Variable("id", "M", "memory", "BOOL");
			expect(variable.ownerBlock).toBeUndefined();
		});
	});
});
