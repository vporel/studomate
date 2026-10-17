import { Dialect } from "@/expression-language/dialect.enum";
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
				const variable = new Variable({
					id: "id",
					mnemonic: "M",
					zone,
					type: ZONES_TO_TYPES[zone][0],
					dialect: Dialect.FR,
				});
				expect(variable.getDirection()).toBe(expected);
			},
		);
	});

	describe("constructor", () => {
		it("lève quand la variable est invalide", () => {
			expect(
				() =>
					new Variable({
						id: "id",
						mnemonic: "1bad",
						zone: "memory",
						type: "BOOL",
						dialect: Dialect.FR,
					}),
			).toThrow();
		});
	});

	describe("constructor validation", () => {
		it("lève 'Invalid variable' pour une combinaison zone/type invalide", () => {
			expect(
				() =>
					new Variable({
						id: "id",
						mnemonic: "M",
						zone: "logic-input",
						type: "INT",
						dialect: Dialect.FR,
					}),
			).toThrow(/^Invalid variable: /);
		});
	});

	describe("fromData", () => {
		const base = {
			id: "v1",
			mnemonic: "arret",
			zone: "logic-input" as const,
			type: "BOOL" as const,
		};

		it("construit une variable sans address, comment ni behavior", () => {
			const variable = Variable.fromData(base, Dialect.FR);

			expect(variable).toMatchObject({
				id: "v1",
				mnemonic: "arret",
				zone: "logic-input",
				type: "BOOL",
				address: "",
				comment: "",
				behavior: null,
			});
		});

		it("reprend address, comment et behavior quand ils sont fournis", () => {
			const variable = Variable.fromData(
				{
					...base,
					address: "%I0.0",
					comment: "bouton",
					behavior: { kind: "push-button-nc", params: null },
				},
				Dialect.FR,
			);

			expect(variable.address).toBe("%I0.0");
			expect(variable.comment).toBe("bouton");
			expect(variable.behavior).toEqual({
				kind: "push-button-nc",
				params: null,
			});
		});

		it("reprend la valeur d'une constante", () => {
			const variable = Variable.fromData(
				{
					id: "k",
					mnemonic: "K",
					zone: "constant",
					type: "INT",
					value: "42",
				},
				Dialect.FR,
			);

			expect(variable.value).toBe("42");
		});

		it("valide dans le dialecte donné", () => {
			const constant = {
				id: "c",
				mnemonic: "B",
				zone: "constant" as const,
				type: "BOOL" as const,
				value: "TRUE",
			};

			expect(Variable.fromData(constant, Dialect.EN).value).toBe("TRUE");
			expect(() => Variable.fromData(constant, Dialect.FR)).toThrow(
				"CONSTANT_VALUE_INVALID",
			);
		});
	});

	describe("update", () => {
		it("normalise le type en majuscules et trime l'adresse", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			});

			const updated = variable.update(
				{
					type: "bool" as Variable["type"],
					address: " %I0.0 ",
				},
				Dialect.FR,
			);

			expect(updated.type).toBe("BOOL");
			expect(updated.address).toBe("%I0.0");
		});

		it("retourne une nouvelle instance sans muter l'original", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			});

			const updated = variable.update({ mnemonic: "AUTRE" }, Dialect.FR);

			expect(updated).not.toBe(variable);
			expect(updated.mnemonic).toBe("AUTRE");
			expect(variable.mnemonic).toBe("M");
		});

		it("lève sans muter l'instance quand le résultat serait invalide", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "logic-input",
				type: "BOOL",
				dialect: Dialect.FR,
			});

			expect(() => variable.update({ type: "INT" }, Dialect.FR)).toThrow();
			expect(variable.type).toBe("BOOL");
		});
	});

	describe("behavior", () => {
		it("vaut null à la création", () => {
			expect(
				new Variable({
					id: "id",
					mnemonic: "BP",
					zone: "logic-input",
					type: "BOOL",
					dialect: Dialect.FR,
				}).behavior,
			).toBeNull();
		});

		it("s'applique via update quand il est valide pour la zone et le type", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "BP",
				zone: "logic-input",
				type: "BOOL",
				dialect: Dialect.FR,
			});

			const updated = variable.update(
				{
					behavior: { kind: "push-button-nc", params: null },
				},
				Dialect.FR,
			);

			expect(updated.behavior).toEqual({
				kind: "push-button-nc",
				params: null,
			});
			expect(variable.behavior).toBeNull();
		});

		it("fait lever update quand il est invalide", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			});

			expect(() =>
				variable.update(
					{ behavior: { kind: "push-button-no", params: null } },
					Dialect.FR,
				),
			).toThrow();
		});

		it("est restitué par createFromJSON, et vaut null pour un projet sans ce champ", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "niveau",
				zone: "analog-input",
				type: "INT",
				dialect: Dialect.FR,
			}).update(
				{
					behavior: { kind: "slider", params: { min: 0, max: 100 } },
				},
				Dialect.FR,
			);
			const { behavior: _omitted, ...legacy } = JSON.parse(
				JSON.stringify(variable),
			);

			expect(
				Variable.createFromJSON(JSON.stringify(variable)).behavior,
			).toEqual({
				kind: "slider",
				params: { min: 0, max: 100 },
			});
			expect(
				Variable.createFromJSON(JSON.stringify(legacy)).behavior,
			).toBeNull();
		});
	});

	describe("copy", () => {
		it("produit une instance indépendante de l'original", () => {
			const original = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			});

			const copie = original.copy();
			copie.mnemonic = "AUTRE";

			expect(original.mnemonic).toBe("M");
			expect(copie).not.toBe(original);
		});
	});

	describe("createFromJSON", () => {
		it("restitue une vraie instance de Variable, pas un objet nu", () => {
			const original = new Variable({
				id: "id1",
				mnemonic: "M",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			});

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
			const variable = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: type as any,
				dialect: Dialect.FR,
			});
			expect(variable.getNativeType()).toBe(expected);
		});
	});

	describe("getNumericRange", () => {
		it("borne INT sur 16 bits signés avec repli", () => {
			const v = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "INT",
				dialect: Dialect.FR,
			});
			expect(v.getNumericRange()).toEqual({
				min: -32768,
				max: 32767,
				integer: true,
				wrap: true,
			});
		});

		it("borne WORD sur 16 bits non signés", () => {
			const v = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "WORD",
				dialect: Dialect.FR,
			});
			expect(v.getNumericRange()).toMatchObject({ min: 0, max: 65535 });
		});

		it("ne contraint pas REAL, TIME, BOOL, STRING", () => {
			for (const type of ["REAL", "TIME", "BOOL", "STRING"] as const) {
				expect(
					new Variable({
						id: "id",
						mnemonic: "M",
						zone: "memory",
						type,
						dialect: Dialect.FR,
					}).getNumericRange(),
				).toBeNull();
			}
		});

		it("borne DINT sur 32 bits signés, avec repli", () => {
			expect(
				new Variable({
					id: "id",
					mnemonic: "M",
					zone: "memory",
					type: "DINT",
					dialect: Dialect.FR,
				}).getNumericRange(),
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
			const variable = new Variable({
				id: "id",
				mnemonic: "Tempo1.PT",
				zone: "memory",
				type: "TIME",
				ownerBlock: {
					id: "block1",
				},
				dialect: Dialect.FR,
			});
			expect(variable.ownerBlock).toEqual({ id: "block1" });
			expect(variable.type).toBe("TIME");
		});

		it("n'a pas d'ownerBlock par défaut", () => {
			const variable = new Variable({
				id: "id",
				mnemonic: "M",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			});
			expect(variable.ownerBlock).toBeUndefined();
		});
	});
});

describe("Variable constant zone", () => {
	it("accepts the 8 types of a memory", () => {
		expect(ZONES_TO_TYPES.constant).toEqual(ZONES_TO_TYPES.memory);
	});

	it("is neither an input nor an output (direction INOUT)", () => {
		const constant = new Variable({
			id: "c",
			mnemonic: "SEUIL",
			zone: "constant",
			type: "INT",
			value: "5",
			dialect: Dialect.FR,
		});

		expect(constant.getDirection()).toBe("INOUT");
	});

	it("is built with its value and validated at construction", () => {
		const constant = new Variable({
			id: "c",
			mnemonic: "SEUIL",
			zone: "constant",
			type: "INT",
			value: "5",
			dialect: Dialect.FR,
		});

		expect(constant.value).toBe("5");
		expect(
			() =>
				new Variable({
					id: "c",
					mnemonic: "SEUIL",
					zone: "constant",
					type: "INT",
					dialect: Dialect.FR,
				}),
		).toThrow("CONSTANT_VALUE_MISSING");
		expect(
			() =>
				new Variable({
					id: "c",
					mnemonic: "SEUIL",
					zone: "constant",
					type: "INT",
					value: "99999",
					dialect: Dialect.FR,
				}),
		).toThrow("CONSTANT_VALUE_INVALID");
	});

	it("validates a boolean value with the dialect given to the constructor", () => {
		expect(
			() =>
				new Variable({
					id: "c",
					mnemonic: "B",
					zone: "constant",
					type: "BOOL",
					value: "TRUE",
					dialect: Dialect.FR,
				}),
		).toThrow("CONSTANT_VALUE_INVALID");
		expect(
			new Variable({
				id: "c",
				mnemonic: "B",
				zone: "constant",
				type: "BOOL",
				value: "TRUE",
				dialect: Dialect.EN,
			}).value,
		).toBe("TRUE");
	});

	it("update revalidates the value with the dialect", () => {
		const constant = new Variable({
			id: "c",
			mnemonic: "B",
			zone: "constant",
			type: "BOOL",
			value: "FAUX",
			dialect: Dialect.FR,
		});

		expect(() => constant.update({ value: "FALSE" }, Dialect.FR)).toThrow(
			"CONSTANT_VALUE_INVALID",
		);
		expect(constant.update({ value: "FALSE" }, Dialect.EN).value).toBe("FALSE");
		expect(constant.value).toBe("FAUX");
	});

	it("update refuses an address and a type that no longer fits the value", () => {
		const constant = new Variable({
			id: "c",
			mnemonic: "S",
			zone: "constant",
			type: "INT",
			value: "5",
			dialect: Dialect.FR,
		});

		expect(() => constant.update({ address: "%MW1" }, Dialect.FR)).toThrow(
			"ADDRESS_NOT_ALLOWED_FOR_CONSTANT",
		);
		expect(() => constant.update({ type: "TIME" }, Dialect.FR)).toThrow(
			"CONSTANT_VALUE_INVALID",
		);
	});

	it("copy and createFromJSON keep the value", () => {
		const constant = new Variable({
			id: "c",
			mnemonic: "S",
			zone: "constant",
			type: "INT",
			value: "5",
			dialect: Dialect.FR,
		});

		expect(constant.copy().value).toBe("5");
		expect(Variable.createFromJSON(JSON.stringify(constant)).value).toBe("5");
	});
});
