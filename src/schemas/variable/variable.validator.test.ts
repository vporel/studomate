import {
	getValidTypesForZones,
	ZONES_TO_TYPES,
	type VariableZone,
} from "./variable.schema";
import {
	validateAddress,
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

	it("ADDRESS_INVALID pour un préfixe inconnu", () => {
		expect(codes(validateAddress("%ZZ1"))).toContain("ADDRESS_INVALID");
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
		const issues = validateVariable({
			mnemonic: "1bad",
			zone: "logic-input",
			type: "INT",
			address: "nope",
		});
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
			validateVariable({ mnemonic: "M", zone: "memory", type: "BOOL" }),
		).toEqual([]);
	});
});
