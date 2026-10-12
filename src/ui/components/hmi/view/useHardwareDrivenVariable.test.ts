/**
 * @jest-environment jsdom
 */
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useHardwareDrivenVariable from "./useHardwareDrivenVariable";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(mnemonic: string | null | undefined, drivenInputIds: string[]) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: {
				variables: [new Variable("v1", "BP", "logic-input", "BOOL")],
			},
			hardwareLink: { status: "linked", drivenInputIds },
		}),
	);
	return renderHook(() => useHardwareDrivenVariable(mnemonic)).result.current;
}

describe("useHardwareDrivenVariable", () => {
	it("is true for a variable driven by the board", () => {
		expect(setup("BP", ["v1"])).toBe(true);
	});

	it("is false when the board does not drive it", () => {
		expect(setup("BP", [])).toBe(false);
	});

	it("is false for an unbound or undeclared widget variable", () => {
		expect(setup(null, ["v1"])).toBe(false);
		expect(setup(undefined, ["v1"])).toBe(false);
		expect(setup("INCONNUE", ["v1"])).toBe(false);
	});
});
