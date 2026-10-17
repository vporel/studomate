import { ProjectMode } from "./ProjectMode.enum";
import {
	selectHardwareActions,
	type HardwareActions,
} from "./hardware-actions.selector";
import type { SimulationKind } from "./SimulationKind";

type Overrides = {
	hasTarget?: boolean;
	mode?: ProjectMode;
	kind?: SimulationKind;
	status?: "disconnected" | "connecting" | "linked";
	boardMode?: string;
	programPresent?: boolean;
	uploading?: boolean;
};

const actions = (o: Overrides = {}, supported = true): HardwareActions =>
	selectHardwareActions(
		{
			project: (o.hasTarget ?? true) ? { hardwareTarget: {} } : {},
			mode: o.mode ?? ProjectMode.DESIGN,
			simulationKind: o.kind ?? "virtual",
			hardwareLink: {
				status: o.status ?? "disconnected",
				boardMode: o.boardMode ?? "idle",
				programPresent: o.programPresent ?? false,
			},
			hardwareUpload: { phase: o.uploading ? "uploading" : "idle" },
		} as never,
		supported,
	);

const linked = (o: Overrides = {}) => actions({ status: "linked", ...o });

describe("selectHardwareActions", () => {
	it("enables upload and link when disconnected in design", () => {
		expect(actions()).toEqual({
			boardInUse: false,
			canUpload: true,
			canLink: true,
			canUnlink: false,
			canStart: false,
			canStop: false,
		});
	});

	it("disables everything without a target", () => {
		const a = linked({ hasTarget: false, programPresent: true });
		expect(a).toMatchObject({
			canUpload: false,
			canLink: false,
			canUnlink: false,
			canStart: false,
			canStop: false,
		});
	});

	it("disables everything in an unsupported browser", () => {
		const a = actions({ status: "linked", programPresent: true }, false);
		expect(a).toMatchObject({
			canUpload: false,
			canLink: false,
			canUnlink: false,
			canStart: false,
			canStop: false,
		});
	});

	it("while connecting, blocks upload and link", () => {
		expect(actions({ status: "connecting" })).toMatchObject({
			canUpload: false,
			canLink: false,
			canUnlink: false,
		});
	});

	it("when linked, blocks link and allows upload and unlink", () => {
		expect(linked()).toMatchObject({
			canUpload: true,
			canLink: false,
			canUnlink: true,
		});
	});

	it.each([
		["remote-io", true, true, false],
		["remote-io", false, false, false],
		["program-stopped", true, true, false],
		["program-stopped", false, false, false],
		["program-running", true, false, true],
		["program-running", false, false, true],
	])(
		"linked in %s mode, programPresent=%s: start=%s stop=%s",
		(boardMode, programPresent, canStart, canStop) => {
			expect(linked({ boardMode, programPresent })).toMatchObject({
				canStart,
				canStop,
			});
		},
	);

	it("does not use the board in a virtual simulation", () => {
		const a = linked({
			mode: ProjectMode.SIMULATION,
			kind: "virtual",
			programPresent: true,
		});
		expect(a).toMatchObject({
			boardInUse: false,
			canUnlink: true,
			canStart: true,
			canUpload: false,
		});
	});

	it.each<SimulationKind>(["hardware-io", "observation"])(
		"locks board actions in a %s simulation",
		(kind) => {
			const a = linked({
				mode: ProjectMode.SIMULATION,
				kind,
				programPresent: true,
			});
			expect(a).toMatchObject({
				boardInUse: true,
				canUnlink: false,
				canStart: false,
				canStop: false,
			});
		},
	);

	it("does not lock the board in design whatever the simulation kind", () => {
		expect(linked({ kind: "observation" }).boardInUse).toBe(false);
	});

	it("blocks upload, link, unlink, start and stop while uploading", () => {
		expect(linked({ uploading: true, programPresent: true })).toMatchObject({
			canUpload: false,
			canUnlink: false,
			canStart: false,
		});
		expect(actions({ uploading: true }).canLink).toBe(false);
		expect(
			linked({ uploading: true, boardMode: "program-running" }).canStop,
		).toBe(false);
	});
});
