/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import type Project from "@/schemas/project/project.schema";
import { useBlockNameField } from "./useBlockNameField";

function projectWith(taken: string[]) {
	return {
		isMnemonicTaken: jest.fn((name: string) => taken.includes(name)),
	} as unknown as Project;
}

function errorsFor(
	name: string,
	initialName: string | undefined,
	project: Project | null | undefined,
) {
	return renderHook(() => useBlockNameField(name, initialName, project), {
		wrapper: i18nWrapper(),
	}).result.current;
}

describe("useBlockNameField", () => {
	it("returns no error for an empty name", () => {
		expect(errorsFor("", undefined, projectWith([""]))).toEqual([]);
	});

	it("returns no error for a free valid name", () => {
		expect(errorsFor("Tempo1", undefined, projectWith([]))).toEqual([]);
	});

	it("returns no error without a project", () => {
		expect(errorsFor("Tempo1", undefined, null)).toEqual([]);
	});

	it("reports a name already used in the project", () => {
		const errors = errorsFor("Tempo1", undefined, projectWith(["Tempo1"]));

		expect(errors).toEqual([
			"Ce nom est déjà utilisé par une variable ou un autre bloc du projet.",
		]);
	});

	it("does not report the unchanged name of the edited block", () => {
		const project = projectWith(["Tempo1"]);

		expect(errorsFor("Tempo1", "Tempo1", project)).toEqual([]);
		expect(project.isMnemonicTaken).not.toHaveBeenCalled();
	});

	it("still reports a conflict with another name when editing", () => {
		expect(errorsFor("Tempo2", "Tempo1", projectWith(["Tempo2"]))).toHaveLength(
			1,
		);
	});

	it("reports an invalid mnemonic without checking name availability", () => {
		const project = projectWith(["1abc"]);
		const errors = errorsFor("1abc", undefined, project);

		expect(errors.length).toBeGreaterThan(0);
		expect(project.isMnemonicTaken).not.toHaveBeenCalled();
	});
});
