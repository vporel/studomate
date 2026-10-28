import { StepData } from "../step.schema";
import StepHelper from "./step.helper";

describe("StepHelper.isInitial", () => {
	it("is true only when initial is true", () => {
		expect(StepHelper.isInitial({ number: 0, initial: true })).toBe(true);
	});

	it("is false when initial is false", () => {
		expect(StepHelper.isInitial({ number: 0, initial: false })).toBe(false);
	});

	it("is false when initial is undefined", () => {
		expect(StepHelper.isInitial({ number: 0 })).toBe(false);
	});
});

describe("StepHelper.hasNumber", () => {
	it("is true for 0 although falsy", () => {
		expect(StepHelper.hasNumber({ number: 0 })).toBe(true);
	});

	it("is true for a positive integer", () => {
		expect(StepHelper.hasNumber({ number: 12 })).toBe(true);
	});

	it("is false for an empty number", () => {
		expect(StepHelper.hasNumber({ number: "" })).toBe(false);
	});

	it("is false for a null number", () => {
		expect(StepHelper.hasNumber({ number: null } as unknown as StepData)).toBe(
			false,
		);
	});

	it("is false for an undefined number", () => {
		expect(
			StepHelper.hasNumber({ number: undefined } as unknown as StepData),
		).toBe(false);
	});
});

describe("StepHelper.parseStepVariableMnemonic", () => {
	it.each([
		["X0", 0],
		["X12", 12],
	])("parses %s as %i", (mnemonic, expected) => {
		expect(StepHelper.parseStepVariableMnemonic(mnemonic)).toBe(expected);
	});

	it.each(["X", "Xa", "X-1", "Y3", "X1.5", ""])(
		"returns null for %p",
		(mnemonic) => {
			expect(StepHelper.parseStepVariableMnemonic(mnemonic)).toBeNull();
		},
	);

	it.each([0, 1, 7, 42, 100])("round-trips step number %i", (n) => {
		expect(
			StepHelper.parseStepVariableMnemonic(
				StepHelper.getStepVariableMnemonic(n),
			),
		).toBe(n);
	});
});
