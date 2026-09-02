/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useFileMenu from "./useFileMenu";

jest.mock("@/ui/components/projects/ProjectContext");

describe("useFileMenu", () => {
	const setOpenModalVisible = jest.fn();
	const setExportModalVisible = jest.fn();
	const setSaveAsModalVisible = jest.fn();
	const newProject = jest.fn();
	const closeProject = jest.fn();
	const saveProject = jest.fn();
	const openPage = jest.fn();

	function setup(mode: ProjectMode) {
		const state = {
			setOpenModalVisible,
			setExportModalVisible,
			setSaveAsModalVisible,
			lifecycleManager: { newProject, closeProject, saveProject },
			pagesManager: { openPage },
			mode,
		};
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation(state),
		);
		return renderHook(() => useFileMenu(), { wrapper: i18nWrapper() });
	}

	afterEach(() => jest.clearAllMocks());

	it("exposes the file menu groups", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const labels = result.current.items.map((group) =>
			group.map((i) => i.label),
		);
		expect(labels).toEqual([
			["Nouveau projet"],
			["Ouvrir projet"],
			["Enregistrer"],
			["Enregistrer sous"],
			["Exporter"],
			["Fermer le projet"],
			["Préférences"],
		]);
	});

	it("disables project-editing actions outside design mode, but keeps save enabled", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		expect(result.current.items[0][0].disabled).toBe(true); // Nouveau projet
		expect(result.current.items[1][0].disabled).toBe(true); // Ouvrir projet
		expect(result.current.items[2][0].disabled).toBeUndefined(); // Enregistrer
		expect(result.current.items[3][0].disabled).toBeUndefined(); // Enregistrer sous
		expect(result.current.items[4][0].disabled).toBe(true); // Exporter
		expect(result.current.items[5][0].disabled).toBe(true); // Fermer le projet
		expect(result.current.items[6][0].disabled).toBeUndefined(); // Préférences
	});

	it("triggers the corresponding actions when designing", () => {
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current.items[0][0].onClick?.());
		expect(newProject).toHaveBeenCalled();

		act(() => result.current.items[1][0].onClick?.());
		expect(setOpenModalVisible).toHaveBeenCalledWith(true);

		act(() => result.current.items[2][0].onClick?.());
		expect(saveProject).toHaveBeenCalled();

		act(() => result.current.items[3][0].onClick?.());
		expect(setSaveAsModalVisible).toHaveBeenCalledWith(true);

		act(() => result.current.items[4][0].onClick?.());
		expect(setExportModalVisible).toHaveBeenCalledWith(true);

		act(() => result.current.items[5][0].onClick?.());
		expect(closeProject).toHaveBeenCalled();

		act(() => result.current.items[6][0].onClick?.());
		expect(openPage).toHaveBeenCalled();
	});

	it("does not trigger design-only actions outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);

		act(() => result.current.items[0][0].onClick?.());
		act(() => result.current.items[1][0].onClick?.());
		act(() => result.current.items[4][0].onClick?.());
		act(() => result.current.items[5][0].onClick?.());

		expect(newProject).not.toHaveBeenCalled();
		expect(setOpenModalVisible).not.toHaveBeenCalled();
		expect(setExportModalVisible).not.toHaveBeenCalled();
		expect(closeProject).not.toHaveBeenCalled();
	});
});
