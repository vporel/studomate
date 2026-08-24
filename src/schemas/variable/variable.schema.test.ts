import Variable, { VariableZone, ZONES_TO_TYPES } from "./variable.schema";

describe("Variable", () => {
	describe("validateMnemonic", () => {
		it("rejette un mnémonique vide", () => {
			expect(Variable.validateMnemonic("")).not.toEqual([]);
		});

		it("rejette un mnémonique de plus de 32 caractères", () => {
			expect(Variable.validateMnemonic("A".repeat(33))).not.toEqual([]);
		});

		it("accepte un mnémonique de 32 caractères", () => {
			expect(Variable.validateMnemonic("A".repeat(32))).toEqual([]);
		});

		it("rejette un mnémonique qui ne commence pas par une lettre", () => {
			expect(Variable.validateMnemonic("1ABC")).not.toEqual([]);
		});

		it("rejette un mnémonique contenant un tiret, une espace ou un accent", () => {
			expect(Variable.validateMnemonic("A-B")).not.toEqual([]);
			expect(Variable.validateMnemonic("A B")).not.toEqual([]);
			expect(Variable.validateMnemonic("Àbc")).not.toEqual([]);
		});

		it("accepte un mnémonique valide avec underscore et chiffres", () => {
			expect(Variable.validateMnemonic("A_1")).toEqual([]);
		});

		it("rejette un point sans ownerBlock", () => {
			expect(Variable.validateMnemonic("Tempo1.IN")).not.toEqual([]);
		});

		it("accepte un seul point avec ownerBlock", () => {
			expect(Variable.validateMnemonic("Tempo1.IN", true)).toEqual([]);
		});

		it("rejette deux points avec ownerBlock", () => {
			expect(Variable.validateMnemonic("Tempo1.IN.PT", true)).not.toEqual([]);
		});
	});

	describe("validateAddress", () => {
		it("accepte une adresse vide (optionnelle)", () => {
			expect(Variable.validateAddress("")).toEqual([]);
		});

		it("rejette une adresse sans %", () => {
			expect(Variable.validateAddress("I0.0")).not.toEqual([]);
		});

		it("accepte %I0.0, %QW10 et %MD100", () => {
			expect(Variable.validateAddress("%I0.0")).toEqual([]);
			expect(Variable.validateAddress("%QW10")).toEqual([]);
			expect(Variable.validateAddress("%MD100")).toEqual([]);
		});

		it("rejette %ZZ1 (préfixe inconnu)", () => {
			expect(Variable.validateAddress("%ZZ1")).not.toEqual([]);
		});
	});

	describe("validateZoneType", () => {
		it.each(Object.entries(ZONES_TO_TYPES) as [VariableZone, string[]][])(
			"accepte chaque type déclaré compatible avec la zone %s",
			(zone, types) => {
				for (const type of types) {
					expect(Variable.validateZoneType(zone, type as any)).toEqual([]);
				}
			},
		);

		it("rejette un type incompatible avec la zone", () => {
			expect(Variable.validateZoneType("logic-input", "INT")).not.toEqual([]);
		});
	});

	describe("getDirection", () => {
		it.each([
			["logic-input", "IN"],
			["analog-input", "IN"],
			["logic-output", "OUT"],
			["analog-output", "OUT"],
			["memory", "INOUT"],
		] as [VariableZone, string][])("zone %s → direction %s", (zone, expected) => {
			const variable = new Variable("id", "M", zone, ZONES_TO_TYPES[zone][0]);
			expect(variable.getDirection()).toBe(expected);
		});
	});

	describe("update", () => {
		it("normalise le type en majuscules et trime l'adresse", () => {
			const variable = new Variable("id", "M", "memory", "BOOL");

			variable.update({ type: "bool" as Variable["type"], address: " %I0.0 " });

			expect(variable.type).toBe("BOOL");
			expect(variable.address).toBe("%I0.0");
		});

		it("lève sans muter l'instance quand le résultat serait invalide", () => {
			const variable = new Variable("id", "M", "logic-input", "BOOL");

			expect(() => variable.update({ type: "INT" })).toThrow();
			expect(variable.type).toBe("BOOL");
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

	describe("getValidTypesForZones", () => {
		it("agrège sans doublon les types valides de plusieurs zones", () => {
			expect(Variable.getValidTypesForZones(["logic-input", "logic-output"])).toEqual(["BOOL"]);
		});
	});

	describe("validateType", () => {
		it("rejette un type inconnu", () => {
			expect(Variable.validateType("UNKNOWN")).not.toEqual([]);
		});

		it("accepte un type reconnu sans contrainte de zone", () => {
			expect(Variable.validateType("BOOL")).toEqual([]);
		});

		it("rejette un type incompatible avec les zones fournies", () => {
			expect(Variable.validateType("INT", ["logic-input"])).not.toEqual([]);
		});

		it("accepte TIME uniquement en zone memory", () => {
			expect(Variable.validateType("TIME", ["memory"])).toEqual([]);
			expect(Variable.validateType("TIME", ["logic-input"])).not.toEqual([]);
		});
	});

	describe("ownerBlock", () => {
		it("crée une variable de bloc avec un mnémonique pointé", () => {
			const variable = new Variable("id", "Tempo1.PT", "memory", "TIME", { id: "block1" });
			expect(variable.ownerBlock).toEqual({ id: "block1" });
			expect(variable.type).toBe("TIME");
		});

		it("n'a pas d'ownerBlock par défaut", () => {
			const variable = new Variable("id", "M", "memory", "BOOL");
			expect(variable.ownerBlock).toBeUndefined();
		});
	});
});
