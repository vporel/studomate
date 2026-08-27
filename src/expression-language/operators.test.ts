import {
	ARITHMETIC_OPERATORS,
	COMPARISON_OPERATORS,
	ASSIGNMENT_OPERATOR,
} from "@/expression-language/operators";

describe("operators constants", () => {
	it("defines assignment operator", () => {
		expect(ASSIGNMENT_OPERATOR).toBe(":=");
	});

	it("contains arithmetic operators", () => {
		expect(ARITHMETIC_OPERATORS).toEqual(["+", "-", "*", "/"]);
	});

	it("contains comparison operators", () => {
		expect(COMPARISON_OPERATORS).toEqual(["=", "!=", "<", ">", "<=", ">="]);
	});
});
