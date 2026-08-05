import { formatDate, parseDate } from "./date";

describe("parseDate", () => {
	it("returns a Date unchanged", () => {
		const date = new Date(2024, 0, 15);
		expect(parseDate(date)).toBe(date);
	});

	it("parses an ISO string", () => {
		const result = parseDate("2024-01-15T00:00:00.000Z");
		expect(result).toBeInstanceOf(Date);
		expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
	});

	it("parses a numeric timestamp", () => {
		const timestamp = new Date(2024, 0, 15).getTime();
		expect(parseDate(timestamp).getTime()).toBe(timestamp);
	});
});

describe("formatDate", () => {
	it("formats a Date with the given date-fns format", () => {
		const date = new Date(2024, 0, 15);
		expect(formatDate(date, "yyyy-MM-dd")).toBe("2024-01-15");
	});

	it("formats an ISO string", () => {
		expect(formatDate("2024-01-15T00:00:00.000Z", "yyyy")).toBe("2024");
	});

	it("returns the literal string 'undefined' when given undefined", () => {
		// @ts-expect-error exercising the runtime guard for a value the signature doesn't allow
		expect(formatDate(undefined, "yyyy-MM-dd")).toBe("undefined");
	});
});
