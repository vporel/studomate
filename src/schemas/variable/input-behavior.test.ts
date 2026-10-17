import {
	getAllowedInputBehaviorKinds,
	getInputRestValue,
	getSliderRange,
	InputBehavior,
	isNormallyClosed,
	isPushButtonBehavior,
	isToggleSwitchBehavior,
} from "./input-behavior";

const pbNo: InputBehavior = { kind: "push-button-no", params: null };
const pbNc: InputBehavior = { kind: "push-button-nc", params: null };
const tsNo: InputBehavior = { kind: "toggle-switch-no", params: null };
const tsNc: InputBehavior = { kind: "toggle-switch-nc", params: null };
const slider = (min: number, max: number): InputBehavior => ({
	kind: "slider",
	params: { min, max },
});

describe("getAllowedInputBehaviorKinds", () => {
	it("propose boutons poussoirs et commutateurs pour une entrée TOR", () => {
		expect(getAllowedInputBehaviorKinds("logic-input", "BOOL")).toEqual([
			"push-button-no",
			"push-button-nc",
			"toggle-switch-no",
			"toggle-switch-nc",
		]);
	});

	it.each(["INT", "WORD", "DWORD"] as const)(
		"propose le curseur pour une entrée analogique %s",
		(type) => {
			expect(getAllowedInputBehaviorKinds("analog-input", type)).toEqual(["slider"]);
		},
	);

	it("ne propose rien pour une mémoire ou une sortie", () => {
		expect(getAllowedInputBehaviorKinds("memory", "BOOL")).toEqual([]);
		expect(getAllowedInputBehaviorKinds("memory", "INT")).toEqual([]);
		expect(getAllowedInputBehaviorKinds("logic-output", "BOOL")).toEqual([]);
		expect(getAllowedInputBehaviorKinds("analog-output", "INT")).toEqual([]);
	});
});

describe("prédicats", () => {
	it("distingue boutons poussoirs, commutateurs et contacts NF", () => {
		expect([pbNo, pbNc, tsNo, tsNc, null].map(isPushButtonBehavior)).toEqual([
			true, true, false, false, false,
		]);
		expect([pbNo, pbNc, tsNo, tsNc, undefined].map(isToggleSwitchBehavior)).toEqual([
			false, false, true, true, false,
		]);
		expect([pbNo, pbNc, tsNo, tsNc, slider(0, 10), null].map(isNormallyClosed)).toEqual([
			false, true, false, true, false, false,
		]);
	});
});

describe("getInputRestValue", () => {
	it("vaut VRAI pour un contact NF, FAUX pour un contact NO", () => {
		expect(getInputRestValue(pbNc)).toBe(true);
		expect(getInputRestValue(tsNc)).toBe(true);
		expect(getInputRestValue(pbNo)).toBe(false);
		expect(getInputRestValue(tsNo)).toBe(false);
	});

	it("vaut 0 pour un curseur dont la plage contient 0, sa borne min sinon", () => {
		expect(getInputRestValue(slider(0, 100))).toBe(0);
		expect(getInputRestValue(slider(-50, 50))).toBe(0);
		expect(getInputRestValue(slider(20, 80))).toBe(20);
		expect(getInputRestValue(slider(-100, -10))).toBe(-100);
	});

	it("est indéfinie sans comportement", () => {
		expect(getInputRestValue(null)).toBeUndefined();
		expect(getInputRestValue(undefined)).toBeUndefined();
	});
});

describe("getSliderRange", () => {
	it("donne une plage entière saturante aux bornes du curseur", () => {
		expect(getSliderRange(slider(20, 80))).toEqual({
			min: 20,
			max: 80,
			integer: true,
			wrap: false,
		});
	});

	it("est nulle pour un autre comportement ou sans comportement", () => {
		expect(getSliderRange(pbNo)).toBeNull();
		expect(getSliderRange(null)).toBeNull();
	});
});
