import { Dialect } from "@/expression-language/dialect.enum";
import {
	getValidTypesForZones,
	ZONES_TO_TYPES,
	type VariableZone,
} from "./variable.schema";
import {
	validateAddress,
	validateBehavior,
	validateConstantValue,
	validateMnemonic,
	validateVariable,
	validateVariableType,
	validateZoneType,
} from "./variable.validator";

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("validateMnemonic", () => {
	it("MNEMONIC_EMPTY pour un mnémonique vide", () => {
		expect(codes(validateMnemonic(""))).toContain("MNEMONIC_EMPTY");
	});

	it("MNEMONIC_TOO_LONG au-delà de 32 caractères, avec le max en paramètre", () => {
		const issues = validateMnemonic("A".repeat(33));
		expect(codes(issues)).toContain("MNEMONIC_TOO_LONG");
		expect(issues.find((i) => i.code === "MNEMONIC_TOO_LONG")?.params).toEqual({
			max: 32,
		});
	});

	it("accepte exactement 32 caractères", () => {
		expect(validateMnemonic("A".repeat(32))).toEqual([]);
	});

	it("MNEMONIC_MUST_START_WITH_LETTER si ça ne commence pas par une lettre", () => {
		expect(codes(validateMnemonic("1ABC"))).toContain(
			"MNEMONIC_MUST_START_WITH_LETTER",
		);
	});

	it("MNEMONIC_INVALID_CHARS pour tiret / espace / accent", () => {
		for (const bad of ["A-B", "A B", "Àbc"]) {
			expect(codes(validateMnemonic(bad))).toContain("MNEMONIC_INVALID_CHARS");
		}
	});

	it("accepte lettres, chiffres et underscore", () => {
		expect(validateMnemonic("A_1")).toEqual([]);
	});

	it("RESERVED_SYSTEM_PREFIX pour un mnémonique commençant par _SYS_", () => {
		const issues = validateMnemonic("_SYS_TB_200ms");
		expect(codes(issues)).toContain("RESERVED_SYSTEM_PREFIX");
		expect(
			issues.find((i) => i.code === "RESERVED_SYSTEM_PREFIX")?.params,
		).toEqual({ prefix: "_SYS_" });
		// même avec ownerBlock (variable de bloc générée)
		expect(codes(validateMnemonic("_SYS_Foo.Bar", true))).toContain(
			"RESERVED_SYSTEM_PREFIX",
		);
	});

	it("rejette un point sans ownerBlock, l'accepte avec (un seul)", () => {
		expect(codes(validateMnemonic("Tempo1.IN"))).toContain(
			"MNEMONIC_INVALID_CHARS",
		);
		expect(validateMnemonic("Tempo1.IN", true)).toEqual([]);
		expect(codes(validateMnemonic("Tempo1.IN.PT", true))).toContain(
			"MNEMONIC_BLOCK_FORMAT",
		);
	});
});

describe("validateAddress", () => {
	it("adresse vide = optionnelle, aucun code", () => {
		expect(validateAddress("")).toEqual([]);
	});

	it("ADDRESS_MISSING_PERCENT sans %", () => {
		expect(codes(validateAddress("I0.0"))).toContain("ADDRESS_MISSING_PERCENT");
	});

	it("accepte %I0.0, %QW10, %MD100", () => {
		for (const ok of ["%I0.0", "%QW10", "%MD100"]) {
			expect(validateAddress(ok)).toEqual([]);
		}
	});

	it("accepte les broches matérielles %PD2, %PD13, %PA0", () => {
		for (const ok of ["%PD2", "%PD13", "%PA0", "%PA5"]) {
			expect(validateAddress(ok)).toEqual([]);
		}
	});

	it("accepte les préfixes de la liste fermée et un bit optionnel", () => {
		for (const ok of ["%E1", "%EA3", "%I12345.12345", "%QW10", "%MD100"]) {
			expect(validateAddress(ok)).toEqual([]);
		}
	});

	it("ADDRESS_INVALID pour un préfixe hors de la liste", () => {
		for (const bad of ["%ZZ1", "%X0"]) {
			expect(codes(validateAddress(bad))).toContain("ADDRESS_INVALID");
		}
	});

	it("ADDRESS_INVALID hors du gabarit %<1-2 lettres majuscules><1-5 chiffres>[.<1-5 chiffres>]", () => {
		for (const bad of [
			"%",
			"%1",
			"%I",
			"%i0.0",
			"%ABC1",
			"%I123456",
			"%I0.",
			"%I0.123456",
			"%I0.0.0",
			"%I0 .0",
		]) {
			expect(codes(validateAddress(bad))).toContain("ADDRESS_INVALID");
		}
	});
});

describe("validateZoneType", () => {
	it.each(Object.entries(ZONES_TO_TYPES) as [VariableZone, string[]][])(
		"accepte chaque type compatible avec la zone %s",
		(zone, types) => {
			for (const type of types) {
				expect(validateZoneType(zone, type as never)).toEqual([]);
			}
		},
	);

	it("ZONE_TYPE_INCOMPATIBLE pour un type hors zone", () => {
		const issues = validateZoneType("logic-input", "INT" as never);
		expect(codes(issues)).toContain("ZONE_TYPE_INCOMPATIBLE");
		expect(issues[0].params).toEqual({ type: "INT", zone: "logic-input" });
	});
});

describe("validateVariableType", () => {
	it("TYPE_UNKNOWN pour un type non reconnu", () => {
		expect(codes(validateVariableType("UNKNOWN"))).toContain("TYPE_UNKNOWN");
	});

	it("accepte un type reconnu sans contrainte de zone", () => {
		expect(validateVariableType("BOOL")).toEqual([]);
	});

	it("TYPE_NOT_ALLOWED_IN_ZONE avec la liste des types possibles", () => {
		const issues = validateVariableType("INT", ["logic-input"]);
		expect(codes(issues)).toContain("TYPE_NOT_ALLOWED_IN_ZONE");
		expect(issues[0].params?.allowed).toBe("BOOL");
	});

	it("TIME accepté en memory seulement", () => {
		expect(validateVariableType("TIME", ["memory"])).toEqual([]);
		expect(codes(validateVariableType("TIME", ["logic-input"]))).toContain(
			"TYPE_NOT_ALLOWED_IN_ZONE",
		);
	});
});

describe("getValidTypesForZones", () => {
	it("agrège sans doublon les types valides de plusieurs zones", () => {
		expect(getValidTypesForZones(["logic-input", "logic-output"])).toEqual([
			"BOOL",
		]);
	});
});

describe("validateVariable", () => {
	it("compose mnémonique + zone/type + adresse", () => {
		const issues = validateVariable(
			{
				mnemonic: "1bad",
				zone: "logic-input",
				type: "INT",
				address: "nope",
			},
			Dialect.FR,
		);
		expect(codes(issues)).toEqual(
			expect.arrayContaining([
				"MNEMONIC_MUST_START_WITH_LETTER",
				"ZONE_TYPE_INCOMPATIBLE",
				"ADDRESS_MISSING_PERCENT",
			]),
		);
	});

	it("ne valide pas l'adresse quand elle est absente", () => {
		expect(
			validateVariable(
				{ mnemonic: "M", zone: "memory", type: "BOOL" },
				Dialect.FR,
			),
		).toEqual([]);
	});
});

describe("validateBehavior", () => {
	it("accepte l'absence de comportement partout", () => {
		expect(validateBehavior("memory", "BOOL", null)).toEqual([]);
		expect(validateBehavior("logic-output", "BOOL", undefined)).toEqual([]);
	});

	it("accepte un bouton poussoir ou un commutateur sur une entrée TOR", () => {
		expect(
			validateBehavior("logic-input", "BOOL", {
				kind: "push-button-nc",
				params: null,
			}),
		).toEqual([]);
		expect(
			validateBehavior("logic-input", "BOOL", {
				kind: "toggle-switch-no",
				params: null,
			}),
		).toEqual([]);
	});

	it("BEHAVIOR_NOT_ALLOWED hors des entrées ou pour un type incompatible", () => {
		expect(
			codes(
				validateBehavior("memory", "BOOL", {
					kind: "push-button-no",
					params: null,
				}),
			),
		).toEqual(["BEHAVIOR_NOT_ALLOWED"]);
		expect(
			codes(
				validateBehavior("memory", "INT", {
					kind: "slider",
					params: { min: 0, max: 10 },
				}),
			),
		).toEqual(["BEHAVIOR_NOT_ALLOWED"]);
		expect(
			codes(
				validateBehavior("analog-input", "INT", {
					kind: "push-button-no",
					params: null,
				}),
			),
		).toEqual(["BEHAVIOR_NOT_ALLOWED"]);
		expect(
			codes(
				validateBehavior("logic-input", "BOOL", {
					kind: "slider",
					params: { min: 0, max: 10 },
				}),
			),
		).toEqual(["BEHAVIOR_NOT_ALLOWED"]);
	});

	it("accepte un curseur aux bornes entières, ordonnées, dans la plage du type", () => {
		expect(
			validateBehavior("analog-input", "INT", {
				kind: "slider",
				params: { min: -10, max: 100 },
			}),
		).toEqual([]);
	});

	it("SLIDER_BOUNDS_NOT_INTEGER pour une borne décimale ou absente", () => {
		expect(
			codes(
				validateBehavior("analog-input", "INT", {
					kind: "slider",
					params: { min: 0.5, max: 10 },
				}),
			),
		).toEqual(["SLIDER_BOUNDS_NOT_INTEGER"]);
		expect(
			codes(
				validateBehavior("analog-input", "INT", {
					kind: "slider",
					params: { min: NaN, max: 10 },
				}),
			),
		).toEqual(["SLIDER_BOUNDS_NOT_INTEGER"]);
	});

	it("SLIDER_BOUNDS_ORDER quand min n'est pas strictement inférieur à max", () => {
		expect(
			codes(
				validateBehavior("analog-input", "INT", {
					kind: "slider",
					params: { min: 10, max: 10 },
				}),
			),
		).toEqual(["SLIDER_BOUNDS_ORDER"]);
	});

	it("SLIDER_BOUNDS_OUT_OF_TYPE_RANGE avec la plage du type en paramètres", () => {
		const issues = validateBehavior("analog-input", "WORD", {
			kind: "slider",
			params: { min: -1, max: 10 },
		});
		expect(issues).toEqual([
			{
				code: "SLIDER_BOUNDS_OUT_OF_TYPE_RANGE",
				params: { type: "WORD", min: 0, max: 65535 },
			},
		]);
	});

	it("est appelée par validateVariable", () => {
		expect(
			codes(
				validateVariable(
					{
						mnemonic: "m",
						zone: "memory",
						type: "BOOL",
						behavior: { kind: "push-button-no", params: null },
					},
					Dialect.FR,
				),
			),
		).toEqual(["BEHAVIOR_NOT_ALLOWED"]);
	});
});

describe("validateConstantValue", () => {
	it("ignores every zone but constant", () => {
		expect(
			validateConstantValue("memory", "INT", undefined, Dialect.FR),
		).toEqual([]);
	});

	it("CONSTANT_VALUE_MISSING for an absent or blank value", () => {
		expect(
			codes(validateConstantValue("constant", "INT", undefined, Dialect.FR)),
		).toEqual(["CONSTANT_VALUE_MISSING"]);
		expect(
			codes(validateConstantValue("constant", "INT", "  ", Dialect.FR)),
		).toEqual(["CONSTANT_VALUE_MISSING"]);
	});

	it.each([
		["BOOL", "vrai", Dialect.FR, true],
		["BOOL", "true", Dialect.FR, false],
		["BOOL", "TRUE", Dialect.EN, true],
		["INT", "12", Dialect.FR, true],
		["INT", "40000", Dialect.FR, false],
		["INT", "1.5", Dialect.FR, false],
		["REAL", "1.5", Dialect.FR, true],
		["STRING", '"a"', Dialect.FR, true],
		["STRING", "a", Dialect.FR, false],
		["TIME", "T#5s", Dialect.FR, true],
		["TIME", "5", Dialect.FR, false],
	] as const)("%s %s (%s) valid: %s", (type, value, dialect, valid) => {
		const issues = validateConstantValue("constant", type, value, dialect);
		expect(issues).toEqual(
			valid ? [] : [{ code: "CONSTANT_VALUE_INVALID", params: { type } }],
		);
	});
});

describe("validateVariable on a constant", () => {
	const constant = {
		mnemonic: "SEUIL",
		zone: "constant" as const,
		type: "INT" as const,
		value: "10",
	};

	it("accepts a complete constant", () => {
		expect(validateVariable(constant, Dialect.FR)).toEqual([]);
	});

	it("rejects a constant without value", () => {
		expect(
			codes(validateVariable({ ...constant, value: undefined }, Dialect.FR)),
		).toEqual(["CONSTANT_VALUE_MISSING"]);
	});

	it("rejects an address on a constant", () => {
		expect(
			codes(validateVariable({ ...constant, address: "%MW10" }, Dialect.FR)),
		).toEqual(["ADDRESS_NOT_ALLOWED_FOR_CONSTANT"]);
	});

	it("validates the boolean literal against the given dialect", () => {
		const boolConstant = { ...constant, type: "BOOL" as const, value: "TRUE" };

		expect(codes(validateVariable(boolConstant, Dialect.FR))).toEqual([
			"CONSTANT_VALUE_INVALID",
		]);
		expect(validateVariable(boolConstant, Dialect.EN)).toEqual([]);
	});
});
