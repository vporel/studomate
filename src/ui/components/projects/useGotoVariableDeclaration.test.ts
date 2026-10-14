/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
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

		goto(
			new Variable({
				id: "v1",
				mnemonic: "I0",
				zone: "logic-input",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "input-variables" }),
		);
		expect(setVariableToReveal).toHaveBeenCalledWith("v1");
	});

	it("mappe une zone de sortie analogique vers la page des sorties", () => {
		const { goto, openPage } = setup();

		goto(
			new Variable({
				id: "v2",
				mnemonic: "QW0",
				zone: "analog-output",
				type: "INT",
				dialect: Dialect.FR,
			}),
		);

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "output-variables" }),
		);
	});

	it("mappe la zone mémoire vers la page des mémoires", () => {
		const { goto, openPage } = setup();

		goto(
			new Variable({
				id: "v3",
				mnemonic: "M0",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "memory-variables" }),
		);
	});

	it("ouvre la page « Variables système » sans révélation pour une variable _SYS_", () => {
		const { goto, openPage, setVariableToReveal } = setup();

		const systemVar = Object.assign(
			new Variable({
				id: "_sys",
				mnemonic: "sys",
				zone: "logic-input",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
			{ mnemonic: "_SYS_TB_1s" },
		);
		goto(systemVar);

		expect(openPage).toHaveBeenCalledWith(SYSTEM_VARIABLES_PAGE_DATA);
		expect(setVariableToReveal).not.toHaveBeenCalled();
	});
});
