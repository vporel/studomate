/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { SYSTEM_VARIABLES_PAGE_DATA } from "../pages/SystemVariablesPage";
import useGotoVariableDeclaration from "./useGotoVariableDeclaration";

jest.mock("@/ui/components/projects/ProjectContext");

function setup() {
	const openPage = jest.fn();
	const setVariableToReveal = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pagesManager: { openPage },
			setVariableToReveal,
		}),
	);
	const { result } = renderHook(() => useGotoVariableDeclaration());
	return { goto: result.current, openPage, setVariableToReveal };
}

describe("useGotoVariableDeclaration", () => {
	afterEach(() => jest.clearAllMocks());

	it("ouvre la page de la zone d'entrée et demande la révélation de la ligne", () => {
		const { goto, openPage, setVariableToReveal } = setup();

		goto(new Variable("v1", "I0", "logic-input", "BOOL"));

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "input-variables" }),
		);
		expect(setVariableToReveal).toHaveBeenCalledWith("v1");
	});

	it("mappe une zone de sortie analogique vers la page des sorties", () => {
		const { goto, openPage } = setup();

		goto(new Variable("v2", "QW0", "analog-output", "INT"));

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "output-variables" }),
		);
	});

	it("mappe la zone mémoire vers la page des mémoires", () => {
		const { goto, openPage } = setup();

		goto(new Variable("v3", "M0", "memory", "BOOL"));

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "memory-variables" }),
		);
	});

	it("ouvre la page « Variables système » sans révélation pour une variable _SYS_", () => {
		const { goto, openPage, setVariableToReveal } = setup();

		const systemVar = Object.assign(
			new Variable("_sys", "sys", "logic-input", "BOOL"),
			{ mnemonic: "_SYS_TB_1s" },
		);
		goto(systemVar);

		expect(openPage).toHaveBeenCalledWith(SYSTEM_VARIABLES_PAGE_DATA);
		expect(setVariableToReveal).not.toHaveBeenCalled();
	});
});
