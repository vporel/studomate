import {
	GRAFCET_TOOL_IDS,
	isGrafcetToolAvailable,
	isLadderToolAvailable,
	LADDER_TOOL_IDS,
} from "./editor-tools";

describe("isLadderToolAvailable", () => {
	it("offers every ladder tool when no tools are restricted", () => {
		expect(isLadderToolAvailable(undefined, "user-program")).toBe(true);
	});

	it("offers every ladder tool when only other editors are restricted", () => {
		expect(isLadderToolAvailable({ grafcet: [] }, "contact-NO")).toBe(true);
	});

	it("offers only the listed ladder tools", () => {
		const tools = { ladder: ["contact-NO" as const, "coil-normal" as const] };

		expect(isLadderToolAvailable(tools, "contact-NO")).toBe(true);
		expect(isLadderToolAvailable(tools, "coil-normal")).toBe(true);
		expect(isLadderToolAvailable(tools, "contact-NF")).toBe(false);
		expect(isLadderToolAvailable(tools, "user-program")).toBe(false);
	});

	it("offers no ladder tool for an empty list", () => {
		expect(isLadderToolAvailable({ ladder: [] }, "contact-NO")).toBe(false);
	});
});

describe("isGrafcetToolAvailable", () => {
	it("offers every grafcet tool when no tools are restricted", () => {
		expect(isGrafcetToolAvailable(undefined, "comment")).toBe(true);
	});

	it("offers every grafcet tool when only other editors are restricted", () => {
		expect(isGrafcetToolAvailable({ ladder: [] }, "step")).toBe(true);
	});

	it("offers only the listed grafcet tools", () => {
		const tools = { grafcet: ["step-initial" as const, "step" as const] };

		expect(isGrafcetToolAvailable(tools, "step-initial")).toBe(true);
		expect(isGrafcetToolAvailable(tools, "step")).toBe(true);
		expect(isGrafcetToolAvailable(tools, "transition")).toBe(false);
	});

	it("offers no grafcet tool for an empty list", () => {
		expect(isGrafcetToolAvailable({ grafcet: [] }, "step")).toBe(false);
	});
});

describe("tool ids", () => {
	it("name every ladder tool once", () => {
		expect(new Set(LADDER_TOOL_IDS).size).toBe(LADDER_TOOL_IDS.length);
		expect(LADDER_TOOL_IDS).toEqual(
			expect.arrayContaining(["contact-NO", "coil-falling", "user-program"]),
		);
	});

	it("name every grafcet tool once, the initial step apart from the other steps", () => {
		expect(new Set(GRAFCET_TOOL_IDS).size).toBe(GRAFCET_TOOL_IDS.length);
		expect(GRAFCET_TOOL_IDS).toEqual(
			expect.arrayContaining(["step-initial", "step", "junction-or-start"]),
		);
	});
});
