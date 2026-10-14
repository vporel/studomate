/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useDrivenInputVariable from "./useDrivenInputVariable";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(
	mnemonic: string | null | undefined,
	drivenInputIds: string[],
	scene3dDrivenInputIds: string[] = [],
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: {
				variables: [
					new Variable({
						id: "v1",
						mnemonic: "BP",
						zone: "logic-input",
						type: "BOOL",
						dialect: Dialect.FR,
					}),
				],
			},
			hardwareLink: { status: "linked", drivenInputIds },
			scene3dDrivenInputIds,
		}),
	);
	return renderHook(() => useDrivenInputVariable(mnemonic)).result.current;
}

describe("useDrivenInputVariable", () => {
	it("is true for a variable driven by the board", () => {
		expect(setup("BP", ["v1"])).toBe(true);
	});

	it("is true for a variable driven by a 3D scene sensor", () => {
		expect(setup("BP", [], ["v1"])).toBe(true);
	});

	it("is false when neither the board nor the scene drives it", () => {
		expect(setup("BP", [], ["autre"])).toBe(false);
	});

	it("is false for an unbound or undeclared widget variable", () => {
		expect(setup(null, ["v1"])).toBe(false);
		expect(setup(undefined, ["v1"])).toBe(false);
		expect(setup("INCONNUE", ["v1"])).toBe(false);
	});
});
