/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { useGrafcetStore, useGrafcetStoreApi } from "../context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";
import GrafcetToolbar from "./GrafcetToolbar";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");
const exportTool = jest.fn();
jest.mock("@/ui/components/programs/ExportProgramTool", () => ({
	__esModule: true,
	default: (props: unknown) => {
		exportTool(props);
		return null;
	},
}));

describe("GrafcetToolbar", () => {
	it("assemble tous les outils sans planter", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				mode: ProjectMode.DESIGN,
				editingEnabled: true,
				capabilities: { programExecutionExclusionToggle: true },
			}),
		);
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcet: {
					id: "g1",
					excludedFromExecution: false,
					canBeExcludedFromExecution: () => true,
				},
				nodes: [],
				zoom: 1,
				minZoom: 0.5,
				viewManager: {
					getZoom: () => 1,
					zoomIn: jest.fn(),
					zoomOut: jest.fn(),
				},
			}),
		);

		renderWithI18n(
			<GrafcetToolbarDnDProvider>
				<GrafcetToolbar />
			</GrafcetToolbarDnDProvider>,
		);

		const expectedClasses = [
			"step",
			"action",
			"transition",
			"junction-or-start",
			"junction-or-end",
			"junction-and-start",
			"junction-and-end",
			"step-referral-source",
			"step-referral-target",
			"comment",
		];
		expectedClasses.forEach((cls) => {
			expect(
				document.querySelector(`.grafcet-toolbar__${cls}`),
			).toBeInTheDocument();
		});
		expect(screen.getByText("100%")).toBeInTheDocument();
		expect(document.querySelector(".app-toolbar__zoom-in")).toBeInTheDocument();
		expect(
			document.querySelector(".app-toolbar__zoom-out"),
		).toBeInTheDocument();
	});

	function renderToolbar({
		excludedFromExecution = false,
		canBeExcludedFromExecution = true,
		mode = ProjectMode.DESIGN,
		programExecutionExclusionToggle = true,
	} = {}) {
		const grafcetsManager = { setExcludedFromExecution: jest.fn() };
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				mode,
				editingEnabled: true,
				grafcetsManager,
				capabilities: { programExecutionExclusionToggle },
			}),
		);
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcet: {
					id: "g1",
					excludedFromExecution,
					canBeExcludedFromExecution: () => canBeExcludedFromExecution,
				},
				nodes: [],
				zoom: 1,
				minZoom: 0.5,
				viewManager: {
					getZoom: () => 1,
					zoomIn: jest.fn(),
					zoomOut: jest.fn(),
				},
			}),
		);

		renderWithI18n(
			<GrafcetToolbarDnDProvider>
				<GrafcetToolbar />
			</GrafcetToolbarDnDProvider>,
		);
		return grafcetsManager;
	}

	it("offers to disable the analyser of an analysed grafcet", () => {
		const grafcetsManager = renderToolbar();

		fireEvent.click(screen.getByText("Désactiver l'analyseur"));

		expect(grafcetsManager.setExcludedFromExecution).toHaveBeenCalledWith(
			"g1",
			true,
		);
	});

	it("enables the analyser of a grafcet directly", () => {
		const grafcetsManager = renderToolbar({ excludedFromExecution: true });

		fireEvent.click(screen.getByText("Activer l'analyseur"));

		expect(grafcetsManager.setExcludedFromExecution).toHaveBeenCalledWith(
			"g1",
			false,
		);
	});

	it("offers no analyser toggle for a grafcet that cannot be excluded", () => {
		renderToolbar({ canBeExcludedFromExecution: false });

		expect(
			screen.queryByText("Désactiver l'analyseur"),
		).not.toBeInTheDocument();
	});

	it("still offers to enable the analyser of an excluded grafcet that cannot be excluded", () => {
		renderToolbar({
			excludedFromExecution: true,
			canBeExcludedFromExecution: false,
		});

		expect(screen.getByText("Activer l'analyseur")).toBeInTheDocument();
	});

	it("only warns that an excluded grafcet is not executed during a simulation", () => {
		renderToolbar({
			mode: ProjectMode.SIMULATION,
			excludedFromExecution: true,
		});

		expect(screen.getByText("Non exécuté")).toBeInTheDocument();
		expect(screen.queryByText("Activer l'analyseur")).not.toBeInTheDocument();
	});

	it("shows no analyser item for an analysed grafcet during a simulation", () => {
		renderToolbar({ mode: ProjectMode.SIMULATION });

		expect(
			screen.queryByText("Désactiver l'analyseur"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Non exécuté")).not.toBeInTheDocument();
	});

	it("only warns that an excluded grafcet is not executed when the toggle is not offered", () => {
		renderToolbar({
			excludedFromExecution: true,
			programExecutionExclusionToggle: false,
		});

		expect(screen.getByText("Non exécuté")).toBeInTheDocument();
		expect(screen.queryByText("Activer l'analyseur")).not.toBeInTheDocument();
	});

	it("shows no analyser item for an analysed grafcet when the toggle is not offered", () => {
		renderToolbar({ programExecutionExclusionToggle: false });

		expect(
			screen.queryByText("Désactiver l'analyseur"),
		).not.toBeInTheDocument();
	});

	it("hands the export the grafcet as it is in the store when the export starts", () => {
		const latest = { id: "g1", name: "Cycle modifié" };
		(useGrafcetStoreApi as jest.Mock).mockReturnValue({
			getState: () => ({ grafcet: latest }),
		});
		renderToolbar();

		const { getConfig } = exportTool.mock.calls.at(-1)[0];

		expect(getConfig()).toEqual({ type: "grafcet", program: latest });
	});
});
