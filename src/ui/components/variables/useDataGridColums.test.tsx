/**
 * @jest-environment jsdom
 */
import {
	GridColDef,
	GridEditCellProps,
	GridPreProcessEditCellProps,
	GridSingleSelectColDef,
} from "@mui/x-data-grid";
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { VariableZone } from "@/schemas/variable/variable.schema";
import useGridColumns from "./useDataGridColums";

jest.mock("@/ui/components/projects/ProjectContext");

const valueOptionsOf = (column: GridColDef) =>
	(column as GridSingleSelectColDef).valueOptions as { value: string }[];

const preProcess = (
	column: GridColDef,
	params: Pick<GridPreProcessEditCellProps, "id" | "props"> &
		Partial<GridPreProcessEditCellProps>,
) =>
	column.preProcessEditCellProps!({
		hasChanged: true,
		row: {},
		...params,
	}) as GridEditCellProps;

const parseValue = (column: GridColDef, value: string) =>
	column.valueParser!(value, {}, column, undefined as never);

describe("useGridColumns", () => {
	const variablesManager = {
		existsByMnemonic: jest.fn((): string | undefined => undefined),
		isMnemonicUsedByBlock: jest.fn(() => false),
		getByAddress: jest.fn((): { id: string; mnemonic: string } | null => null),
	};

	function setup(mode: ProjectMode, zones: VariableZone[] = ["logic-input"]) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ variablesManager, mode }),
		);
		return renderHook(() => useGridColumns(zones), { wrapper: i18nWrapper() });
	}

	afterEach(() => jest.clearAllMocks());

	it("defines the mnemonic, type, address, behavior and comment columns for the inputs", () => {
		const { result } = setup(ProjectMode.DESIGN, [
			"logic-input",
			"analog-input",
		]);
		expect(result.current.map((c) => c.field)).toEqual([
			"mnemonic",
			"type",
			"address",
			"behavior",
			"comment",
		]);
	});

	it("adds the read-only value column after the address only in simulation", () => {
		const designing = setup(ProjectMode.DESIGN, ["memory"]);
		expect(designing.result.current.map((c) => c.field)).not.toContain("value");

		const simulating = setup(ProjectMode.SIMULATION, ["memory"]);
		const fields = simulating.result.current.map((c) => c.field);
		expect(fields.indexOf("value")).toBe(fields.indexOf("address") + 1);
		expect(
			simulating.result.current.find((c) => c.field === "value")!.editable,
		).toBe(false);
	});

	it("has no behavior column outside the inputs", () => {
		const outputs = setup(ProjectMode.DESIGN, [
			"logic-output",
			"analog-output",
		]);
		expect(outputs.result.current.map((c) => c.field)).not.toContain(
			"behavior",
		);

		const memories = setup(ProjectMode.DESIGN, ["memory"]);
		expect(memories.result.current.map((c) => c.field)).not.toContain(
			"behavior",
		);
	});

	it("makes columns editable in design mode, and read-only otherwise", () => {
		// The behavior is edited through its own popover, never by row editing.
		const rowEditable = (columns: { field: string }[]) =>
			columns.filter((c) => c.field !== "behavior");

		const designing = setup(ProjectMode.DESIGN);
		expect(
			rowEditable(designing.result.current).every((c: any) => c.editable),
		).toBe(true);
		expect(
			designing.result.current.find((c) => c.field === "behavior")!.editable,
		).toBe(false);

		const simulating = setup(ProjectMode.SIMULATION);
		expect(simulating.result.current.every((c) => !c.editable)).toBe(true);
	});

	it("restricts the type column options to the valid types for the given zones", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const typeColumn = result.current.find((c) => c.field === "type")!;
		expect(valueOptionsOf(typeColumn).map((o) => o.value)).toEqual(["BOOL"]);
	});

	it("rejects an invalid mnemonic in preProcessEditCellProps", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;
		const params = preProcess(mnemonicColumn, {
			id: "1",
			props: { value: "1invalid" },
		});
		expect(params.error).toBeTruthy();
	});

	it("rejects a mnemonic that already exists on another row", () => {
		variablesManager.existsByMnemonic.mockReturnValue("other-id");
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;
		const params = preProcess(mnemonicColumn, {
			id: "this-id",
			props: { value: "OK" },
		});
		expect(params.error).toBe("Ce mnémonique existe déjà");
	});

	it("rejects a mnemonic used by a block and accepts it otherwise", () => {
		variablesManager.existsByMnemonic.mockReturnValue(undefined);
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;

		variablesManager.isMnemonicUsedByBlock.mockReturnValue(true);
		expect(
			preProcess(mnemonicColumn, { id: "1", props: { value: "Tempo1" } }).error,
		).toBe("Ce nom est déjà utilisé par un bloc");

		variablesManager.isMnemonicUsedByBlock.mockReturnValue(false);
		expect(
			preProcess(mnemonicColumn, { id: "1", props: { value: "Tempo1" } }).error,
		).toBe(false);
	});

	it("rejects an address owned by another row and names its owner", () => {
		variablesManager.getByAddress.mockReturnValue({
			id: "other-id",
			mnemonic: "Moteur_M1",
		});
		const { result } = setup(ProjectMode.DESIGN);
		const addressColumn = result.current.find((c) => c.field === "address")!;
		const params = preProcess(addressColumn, {
			id: "this-id",
			props: { value: "%Q0.0" },
		});
		expect(params.error).toBe(
			"Cette adresse est déjà utilisée par « Moteur_M1 »",
		);
	});

	it("accepts an address owned by the row being edited", () => {
		variablesManager.getByAddress.mockReturnValue({
			id: "this-id",
			mnemonic: "Moteur_M1",
		});
		const { result } = setup(ProjectMode.DESIGN);
		const addressColumn = result.current.find((c) => c.field === "address")!;
		const params = preProcess(addressColumn, {
			id: "this-id",
			props: { value: "%Q0.0" },
		});
		expect(params.error).toBe(false);
	});

	it("uppercases and trims addresses via valueParser", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const addressColumn = result.current.find((c) => c.field === "address")!;
		expect(parseValue(addressColumn, " i0.1 ")).toBe("I0.1");
		expect(parseValue(addressColumn, "")).toBe("");
	});

	it("trims mnemonics via valueParser", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;
		expect(parseValue(mnemonicColumn, " foo ")).toBe("foo");
	});

	describe("constants page", () => {
		it("replaces the address column by the declared value column", () => {
			const { result } = setup(ProjectMode.DESIGN, ["constant"]);

			expect(result.current.map((c) => c.field)).toEqual([
				"mnemonic",
				"type",
				"declaredValue",
				"comment",
			]);
		});

		it("offers the 8 types and keeps the declared value editable in design mode only", () => {
			const designing = setup(ProjectMode.DESIGN, ["constant"]);
			const typeColumn = designing.result.current.find(
				(c) => c.field === "type",
			)!;
			expect(valueOptionsOf(typeColumn)).toHaveLength(8);
			expect(
				designing.result.current.find((c) => c.field === "declaredValue")!
					.editable,
			).toBe(true);

			const simulating = setup(ProjectMode.SIMULATION, ["constant"]);
			const fields = simulating.result.current.map((c) => c.field);
			expect(fields).toContain("value");
			expect(
				simulating.result.current.find((c) => c.field === "declaredValue")!
					.editable,
			).toBe(false);
		});

		it("rejects a declared value that does not fit the type of the row", () => {
			const { result } = setup(ProjectMode.DESIGN, ["constant"]);
			const column = result.current.find((c) => c.field === "declaredValue")!;
			const edit = (value: string, type: string) =>
				preProcess(column, {
					id: "k",
					row: { type: "INT" },
					otherFieldsProps: { type: { value: type } },
					props: { value },
				}).error;

			expect(edit("40000", "INT")).toBeTruthy();
			expect(edit("1.5", "INT")).toBeTruthy();
			expect(edit("", "INT")).toBeTruthy();
			expect(edit("40000", "DINT")).toBe(false);
			expect(edit("T#5s", "TIME")).toBe(false);
		});

		it("falls back on the type of the row when the type is not being edited", () => {
			const { result } = setup(ProjectMode.DESIGN, ["constant"]);
			const column = result.current.find((c) => c.field === "declaredValue")!;

			const params = preProcess(column, {
				id: "k",
				row: { type: "TIME" },
				otherFieldsProps: {},
				props: { value: "12" },
			});

			expect(params.error).toBeTruthy();
		});

		it("other pages keep the address column and have no declared value column", () => {
			const { result } = setup(ProjectMode.DESIGN, ["memory"]);

			expect(result.current.map((c) => c.field)).toContain("address");
			expect(result.current.map((c) => c.field)).not.toContain("declaredValue");
		});
	});
});
