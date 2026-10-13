/**
 * @jest-environment jsdom
 */
import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { renderHook } from "@testing-library/react";
import useTargetMenu from "./useTargetMenu";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/hardware/arduino/remote-io/web-serial.transport", () => ({
	isWebSerialSupported: jest.fn(),
}));

describe("useTargetMenu", () => {
	const hardwareLinkManager = {
		uploadProgram: jest.fn(),
		link: jest.fn(),
		unlink: jest.fn(),
		runProgram: jest.fn(),
		stopProgram: jest.fn(),
	};

	function setup(
		overrides: {
			hasTarget?: boolean;
			status?: string;
			mode?: ProjectMode;
			simulationKind?: string;
			boardMode?: string;
			programPresent?: boolean;
			uploadPhase?: string;
		} = {},
	) {
		const o = {
			hasTarget: true,
			status: "disconnected",
			mode: ProjectMode.DESIGN,
			simulationKind: "virtual",
			boardMode: "idle",
			programPresent: false,
			uploadPhase: "idle",
			...overrides,
		};
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				project: o.hasTarget ? { hardwareTarget: { modelId: "m" } } : {},
				hardwareLink: {
					status: o.status,
					boardMode: o.boardMode,
					programPresent: o.programPresent,
				},
				mode: o.mode,
				simulationKind: o.simulationKind,
				hardwareUpload: { phase: o.uploadPhase },
				hardwareLinkManager,
			}),
		);
		const { result } = renderHook(() => useTargetMenu(), {
			wrapper: i18nWrapper(),
		});
		const items = result.current.items.flat();
		const byLabel = (label: string) => items.find((i) => i.label === label)!;
		return { menu: result.current, byLabel };
	}

	beforeEach(() => (isWebSerialSupported as jest.Mock).mockReturnValue(true));
	afterEach(() => jest.clearAllMocks());

	it("has two groups: link actions then program actions", () => {
		const { menu } = setup();
		expect(menu.id).toBe("target");
		expect(menu.label).toBe("Cible");
		expect(menu.items.map((g) => g.map((i) => i.label))).toEqual([
			["Charger le programme", "Liaison en ligne", "Fermer la liaison"],
			["Démarrer le programme", "Arrêter le programme"],
		]);
	});

	it("disconnected: only loading and linking are available", () => {
		const { byLabel } = setup();
		expect(byLabel("Charger le programme").disabled).toBe(false);
		expect(byLabel("Liaison en ligne").disabled).toBe(false);
		expect(byLabel("Fermer la liaison").disabled).toBe(true);
		expect(byLabel("Démarrer le programme").disabled).toBe(true);
		expect(byLabel("Arrêter le programme").disabled).toBe(true);
	});

	it("linked with a stopped program: start is available, stop is not", () => {
		const { byLabel } = setup({
			status: "linked",
			boardMode: "program-stopped",
			programPresent: true,
		});
		expect(byLabel("Liaison en ligne").disabled).toBe(true);
		expect(byLabel("Fermer la liaison").disabled).toBe(false);
		expect(byLabel("Démarrer le programme").disabled).toBe(false);
		expect(byLabel("Arrêter le programme").disabled).toBe(true);
	});

	it("linked with a running program: stop is available, start is not", () => {
		const { byLabel } = setup({
			status: "linked",
			boardMode: "program-running",
			programPresent: true,
		});
		expect(byLabel("Démarrer le programme").disabled).toBe(true);
		expect(byLabel("Arrêter le programme").disabled).toBe(false);
	});

	it("linked without a program: start is not available", () => {
		const { byLabel } = setup({ status: "linked" });
		expect(byLabel("Démarrer le programme").disabled).toBe(true);
	});

	it("loading needs the design mode", () => {
		const { byLabel } = setup({ mode: ProjectMode.SIMULATION });
		expect(byLabel("Charger le programme").disabled).toBe(true);
	});

	it("a mode using the board locks closing the link and the program actions", () => {
		const { byLabel } = setup({
			status: "linked",
			mode: ProjectMode.SIMULATION,
			simulationKind: "hardware-io",
			boardMode: "program-running",
			programPresent: true,
		});
		expect(byLabel("Fermer la liaison").disabled).toBe(true);
		expect(byLabel("Arrêter le programme").disabled).toBe(true);
	});

	it("an upload in progress disables everything", () => {
		const { byLabel } = setup({
			status: "linked",
			boardMode: "program-running",
			programPresent: true,
			uploadPhase: "uploading",
		});
		expect(
			[
				"Charger le programme",
				"Liaison en ligne",
				"Fermer la liaison",
				"Démarrer le programme",
				"Arrêter le programme",
			].every((l) => byLabel(l).disabled),
		).toBe(true);
	});

	it("everything is disabled without a hardware target", () => {
		const { menu } = setup({ hasTarget: false });
		expect(menu.items.flat().every((i) => i.disabled)).toBe(true);
	});

	it("everything is disabled when the browser has no Web Serial", () => {
		(isWebSerialSupported as jest.Mock).mockReturnValue(false);
		const { menu } = setup();
		expect(menu.items.flat().every((i) => i.disabled)).toBe(true);
	});

	it("calls the matching manager action", () => {
		const { byLabel } = setup({
			status: "linked",
			boardMode: "program-stopped",
			programPresent: true,
		});
		byLabel("Charger le programme").onClick!();
		byLabel("Fermer la liaison").onClick!();
		byLabel("Démarrer le programme").onClick!();
		expect(hardwareLinkManager.uploadProgram).toHaveBeenCalled();
		expect(hardwareLinkManager.unlink).toHaveBeenCalled();
		expect(hardwareLinkManager.runProgram).toHaveBeenCalled();
	});
});
