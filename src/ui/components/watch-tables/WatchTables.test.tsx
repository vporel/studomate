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

	function setup() {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				setWatchTablesVisible,
				project: {
					variables: [inputVar, outputVar, memoryVar],
					dialect: Dialect.FR,
				},
				simulationManager: {
					setPhysicalInputValue: jest.fn(),
					setMemoryValue: jest.fn(),
				},
				simulationVariablesStates: {},
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

	it("calls setWatchTablesVisible(false) when closed", () => {
		setup();
		fireEvent.click(screen.getByLabelText("close-watch-tables"));
		expect(setWatchTablesVisible).toHaveBeenCalledWith(false);
	});
});
