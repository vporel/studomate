import { hasDrivenInputs, isInputDriven } from "./driven-inputs.selector";

function state({
	pins = [] as string[],
	sensors = [] as string[],
	hardwareTarget = null as object | null,
	status = "disconnected",
	boardMode = "remote-io",
} = {}) {
	return {
		project: { hardwareTarget },
		hardwareLink: { status, drivenInputIds: pins, boardMode },
		scene3dDrivenInputIds: sensors,
	} as never;
}

describe("isInputDriven", () => {
	it("is true for an input driven by a pin", () => {
		expect(isInputDriven(state({ pins: ["v1"] }), "v1")).toBe(true);
	});

	it("is true for an input driven by a scene sensor", () => {
		expect(isInputDriven(state({ sensors: ["v1"] }), "v1")).toBe(true);
	});

	it("is true when both drive it", () => {
		expect(isInputDriven(state({ pins: ["v1"], sensors: ["v1"] }), "v1")).toBe(
			true,
		);
	});

	it("is false when neither drives it", () => {
		expect(isInputDriven(state({ pins: ["a"], sensors: ["b"] }), "v1")).toBe(
			false,
		);
	});
});

describe("hasDrivenInputs", () => {
	const target = { modelId: "arduino-uno-r3" };

	it("is true with a linked board in remote I/O", () => {
		expect(
			hasDrivenInputs(state({ hardwareTarget: target, status: "linked" })),
		).toBe(true);
	});

	it("is false for a board that is not linked, not configured or running a program", () => {
		expect(hasDrivenInputs(state({ hardwareTarget: target }))).toBe(false);
		expect(hasDrivenInputs(state({ status: "linked" }))).toBe(false);
		expect(
			hasDrivenInputs(
				state({
					hardwareTarget: target,
					status: "linked",
					boardMode: "program-running",
				}),
			),
		).toBe(false);
	});

	it("is true with scene sensors only", () => {
		expect(hasDrivenInputs(state({ sensors: ["v1"] }))).toBe(true);
	});

	it("is false with nothing driving inputs", () => {
		expect(hasDrivenInputs(state())).toBe(false);
	});
});
