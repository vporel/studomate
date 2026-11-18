import { formatDurationMs, isTimeLiteral, parseTimeLiteral } from "./time";

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

describe("formatDurationMs", () => {
	it("formats whole seconds and decimal seconds", () => {
		expect(formatDurationMs(5000)).toBe("5s");
		expect(formatDurationMs(1500)).toBe("1.5s");
		expect(formatDurationMs(1000)).toBe("1s");
	});

	it("formats durations below one second in ms", () => {
		expect(formatDurationMs(200)).toBe("200ms");
		expect(formatDurationMs(0)).toBe("0ms");
	});

	it("uses the largest of d/h/m that divides the duration exactly", () => {
		expect(formatDurationMs(120_000)).toBe("2m");
		expect(formatDurationMs(3_600_000)).toBe("1h");
		expect(formatDurationMs(86_400_000)).toBe("1d");
		expect(formatDurationMs(7_200_000)).toBe("2h");
	});

	it("falls back to seconds when no larger unit divides the duration", () => {
		expect(formatDurationMs(90_000)).toBe("90s");
	});
});
