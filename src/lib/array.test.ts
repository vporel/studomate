import { range } from "./array";

describe("range", () => {
	it("generates a range of numbers, end excluded", () => {
		expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
	});

	it("supports a non-zero start", () => {
		expect(range(3, 6)).toEqual([3, 4, 5]);
	});

	it("returns an empty array when start equals end", () => {
		expect(range(2, 2)).toEqual([]);
	});

	it("returns an empty array when start is greater than end", () => {
		expect(range(5, 2)).toEqual([]);
	});
});
