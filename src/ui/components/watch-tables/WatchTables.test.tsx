/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { Dialect } from "@/expression-language/dialect.enum";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import WatchTables from "./WatchTables";

jest.mock("@/ui/components/projects/ProjectContext");

describe("WatchTables", () => {
	const setWatchTablesVisible = jest.fn();
	const inputVar = new VariableBuilder()
		.id("in-1")
		.mnemonic("E1")
		.zone("logic-input")
		.type("BOOL")
		.build();
	const outputVar = new VariableBuilder()
		.id("out-1")
		.mnemonic("S1")
		.zone("logic-output")
		.type("BOOL")
		.build();
	const memoryVar = new VariableBuilder()
		.id("mem-1")
		.mnemonic("M1")
		.zone("memory")
		.type("INT")
		.build();

	function setup(
		board: {
			hardwareTarget?: object | null;
			status?: string;
			boardMode?: string;
			scene3dDrivenInputIds?: string[];
		} = {},
	) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				setWatchTablesVisible,
				project: {
					variables: [inputVar, outputVar, memoryVar],
					dialect: Dialect.FR,
					grafcets: {},
					hardwareTarget: board.hardwareTarget ?? null,
				},
				simulationManager: {
					setPhysicalInputValue: jest.fn(),
					setMemoryValue: jest.fn(),
				},
				simulationVariablesStates: {},
				hardwareLink: {
					status: board.status ?? "disconnected",
					drivenInputIds: [],
					boardMode: board.boardMode ?? "remote-io",
				},
				scene3dDrivenInputIds: board.scene3dDrivenInputIds ?? [],
			}),
		);
		return renderWithI18n(<WatchTables />);
	}

	afterEach(() => jest.clearAllMocks());

	it("shows the input variables tab by default", () => {
		setup();
		expect(screen.getByText("E1")).toBeInTheDocument();
		expect(screen.queryByText("S1")).not.toBeInTheDocument();
		expect(screen.queryByText("M1")).not.toBeInTheDocument();
	});

	it("switches to the output variables tab", () => {
		setup();
		fireEvent.click(screen.getByText("Sorties"));
		expect(screen.getByText("S1")).toBeInTheDocument();
		expect(screen.queryByText("E1")).not.toBeInTheDocument();
	});

	it("switches to the memory variables tab", () => {
		setup();
		fireEvent.click(screen.getByText("Mémoires"));
		expect(screen.getByText("M1")).toBeInTheDocument();
	});

	it("switches to the grafcets tab", () => {
		setup();
		fireEvent.click(screen.getByText("Grafcets"));
		expect(
			screen.getByText("Aucun grafcet dans le projet"),
		).toBeInTheDocument();
	});

	it("calls setWatchTablesVisible(false) when closed", () => {
		setup();
		fireEvent.click(screen.getByLabelText("close-watch-tables"));
		expect(setWatchTablesVisible).toHaveBeenCalledWith(false);
	});

	describe("message sur les entrées pilotées (carte ou scène 3D)", () => {
		const message =
			"Les entrées pilotées par une borne de la carte ou un capteur de la scène 3D ne sont pas modifiables depuis cette table.";
		const target = { modelId: "arduino-uno-r3" };

		it("s'affiche quand une carte est configurée et liée en E/S", () => {
			setup({ hardwareTarget: target, status: "linked" });
			expect(screen.getByText(message)).toBeInTheDocument();
		});

		it("est absent sans carte configurée", () => {
			setup({ hardwareTarget: null, status: "linked" });
			expect(screen.queryByText(message)).not.toBeInTheDocument();
		});

		it("est absent quand la carte n'est pas liée", () => {
			setup({ hardwareTarget: target, status: "disconnected" });
			expect(screen.queryByText(message)).not.toBeInTheDocument();
		});

		it("s'affiche avec seulement des capteurs de scène 3D", () => {
			setup({ scene3dDrivenInputIds: ["e1"] });
			expect(screen.getByText(message)).toBeInTheDocument();
		});

		it("est absent sans capteur de scène 3D ni carte", () => {
			setup({ scene3dDrivenInputIds: [] });
			expect(screen.queryByText(message)).not.toBeInTheDocument();
		});

		it.each(["program-running", "program-stopped"])(
			"est absent quand la carte est en mode %s (elle ne sert plus les entrées)",
			(boardMode) => {
				setup({ hardwareTarget: target, status: "linked", boardMode });
				expect(screen.queryByText(message)).not.toBeInTheDocument();
			},
		);
	});
});
