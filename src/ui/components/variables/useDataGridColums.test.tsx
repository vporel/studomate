/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { VariableZone } from "@/schemas/variable/variable.schema";
import useGridColumns from "./useDataGridColums";

jest.mock("@/ui/components/projects/ProjectContext");

describe("useGridColumns", () => {
	const variablesManager = {
		existsByMnemonic: jest.fn((): string | undefined => undefined),
		existsByAddress: jest.fn((): string | undefined => undefined),
	};

	function setup(mode: ProjectMode, zones: VariableZone[] = ["logic-input"]) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ variablesManager, mode }),
		);
		return renderHook(() => useGridColumns(zones), { wrapper: i18nWrapper() });
	}

	afterEach(() => jest.clearAllMocks());

	it("defines the mnemonic, type, address, behavior and comment columns for the inputs", () => {
		const { result } = setup(ProjectMode.DESIGN, ["logic-input", "analog-input"]);
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
		expect(simulating.result.current.find((c) => c.field === "value")!.editable).toBe(false);
	});

	it("has no behavior column outside the inputs", () => {
		const outputs = setup(ProjectMode.DESIGN, ["logic-output", "analog-output"]);
		expect(outputs.result.current.map((c) => c.field)).not.toContain("behavior");

		const memories = setup(ProjectMode.DESIGN, ["memory"]);
		expect(memories.result.current.map((c) => c.field)).not.toContain("behavior");
	});

	it("makes columns editable in design mode, and read-only otherwise", () => {
		// The behavior is edited through its own popover, never by row editing.
		const rowEditable = (columns: { field: string }[]) =>
			columns.filter((c) => c.field !== "behavior");

		const designing = setup(ProjectMode.DESIGN);
		expect(rowEditable(designing.result.current).every((c: any) => c.editable)).toBe(true);
		expect(designing.result.current.find((c) => c.field === "behavior")!.editable).toBe(false);

		const simulating = setup(ProjectMode.SIMULATION);
		expect(simulating.result.current.every((c) => !c.editable)).toBe(true);
	});

	it("restricts the type column options to the valid types for the given zones", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const typeColumn = result.current.find((c) => c.field === "type")! as any;
		expect(
			(typeColumn.valueOptions as { value: string }[]).map((o) => o.value),
		).toEqual(["BOOL"]);
	});

	it("rejects an invalid mnemonic in preProcessEditCellProps", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;
		const params = mnemonicColumn.preProcessEditCellProps!({
			id: "1",
			hasChanged: true,
			props: { value: "1invalid" },
		} as any);
		expect((params as any).error).toBeTruthy();
	});

	it("rejects a mnemonic that already exists on another row", () => {
		variablesManager.existsByMnemonic.mockReturnValue("other-id");
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;
		const params = mnemonicColumn.preProcessEditCellProps!({
			id: "this-id",
			hasChanged: true,
			props: { value: "OK" },
		} as any);
		expect((params as any).error).toBe("Ce mnémonique existe déjà");
	});

	it("uppercases and trims addresses via valueParser", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const addressColumn = result.current.find((c) => c.field === "address")!;
		expect(
			addressColumn.valueParser!(
				" i0.1 ",
				undefined,
				undefined as any,
				undefined as any,
			),
		).toBe("I0.1");
		expect(
			addressColumn.valueParser!(
				"",
				undefined,
				undefined as any,
				undefined as any,
			),
		).toBe("");
	});

	it("trims mnemonics via valueParser", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const mnemonicColumn = result.current.find((c) => c.field === "mnemonic")!;
		expect(
			mnemonicColumn.valueParser!(
				" foo ",
				undefined,
				undefined as any,
				undefined as any,
			),
		).toBe("foo");
	});
});
