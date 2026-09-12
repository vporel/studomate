import { isTimeLiteral, parseTimeLiteral } from "./time";

describe("isTimeLiteral", () => {
	it("reconnaît le préfixe T#", () => {
		expect(isTimeLiteral("T#5s")).toBe(true);
		expect(isTimeLiteral("t#5s")).toBe(true);
	});

	it("rejette un nom de variable", () => {
		expect(isTimeLiteral("MaVariable")).toBe(false);
	});
});

describe("parseTimeLiteral", () => {
	it("parse une unité seule", () => {
		expect(parseTimeLiteral("T#5s")).toBe(5000);
		expect(parseTimeLiteral("T#500ms")).toBe(500);
		expect(parseTimeLiteral("T#2m")).toBe(120000);
	});

	it("parse plusieurs unités combinées en ordre décroissant", () => {
		expect(parseTimeLiteral("T#1h2m3s4ms")).toBe(3600000 + 120000 + 3000 + 4);
	});

	it("tolère une valeur seule au-delà de son unité naturelle", () => {
		expect(parseTimeLiteral("T#100s")).toBe(100000);
	});

	it("tolère les décimales", () => {
		expect(parseTimeLiteral("T#1.5s")).toBe(1500);
	});

	it("tolère l'underscore comme séparateur", () => {
		expect(parseTimeLiteral("T#1h_30m")).toBe(3600000 + 1800000);
	});

	it("rejette une chaîne sans préfixe T#", () => {
		expect(parseTimeLiteral("5s")).toBeNull();
	});

	it("rejette un corps vide", () => {
		expect(parseTimeLiteral("T#")).toBeNull();
	});

	it("rejette des caractères inattendus", () => {
		expect(parseTimeLiteral("T#5sx")).toBeNull();
		expect(parseTimeLiteral("T#abc")).toBeNull();
	});
});
