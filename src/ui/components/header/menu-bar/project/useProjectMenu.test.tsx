/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useProjectMenu from "./useProjectMenu";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/pages/ProjectPropertiesPage", () => ({
	PROJECT_PROPERTIES_PAGE_DATA: {
		id: "project-properties",
		type: "project-properties",
		title: "Propriétés",
	},
}));
jest.mock("@/ui/components/pages/HardwareConfigurationPage", () => ({
	HARDWARE_CONFIGURATION_PAGE_DATA: {
		id: "hardware-configuration",
		type: "hardware-configuration",
		title: "Configuration matérielle",
	},
}));
jest.mock("@/ui/components/pages/ExercisePage", () => ({
	EXERCISE_PAGE_DATA: {
		id: "exercise",
		type: "exercise",
		title: "Énoncé de l'exercice",
	},
}));

describe("useProjectMenu", () => {
	const grafcetsManager = { newGrafcet: jest.fn() };
	const laddersManager = { newLadder: jest.fn() };
	const hmiManager = { newHmiPage: jest.fn() };
	const pagesManager = { openPage: jest.fn() };
	const shareProject = jest.fn();
	const setShareModalVisible = jest.fn();

	function setup(
		mode: ProjectMode,
		isSharedProject = false,
		exerciseStatement: string | undefined = undefined,
	) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcetsManager,
				laddersManager,
				hmiManager,
				pagesManager,
				mode,
				isSharedProject,
				sharingManager: { shareProject },
				setShareModalVisible,
				project: exerciseStatement
					? { exercise: { statement: exerciseStatement } }
					: {},
			}),
		);
		return renderHook(() => useProjectMenu(), { wrapper: i18nWrapper() });
	}

	afterEach(() => jest.clearAllMocks());

	const groupOf = (
		items: ReturnType<typeof useProjectMenu>["items"],
		label: string,
	) => items.find((group) => group.some((item) => item.label === label))!;

	it("exposes the project menu groups", () => {
		const { result } = setup(ProjectMode.DESIGN);
		expect(result.current.id).toBe("project");
		expect(result.current.items[0][0].label).toBe("Nouveau grafcet");
		expect(
			result.current.items.map((group) => group.map((i) => i.label)),
		).toEqual([
			["Nouveau grafcet", "Nouveau ladder", "Nouvelle page HMI"],
			["Configuration matérielle", "Configuration scène 3D"],
			["Partager", "Gérer le partage"],
			["Propriétés"],
		]);
	});

	it("place l'énoncé de l'exercice dans son propre groupe, entre les configurations et le partage", () => {
		const { result } = setup(ProjectMode.DESIGN, false, "Énoncé");
		expect(
			result.current.items.map((group) => group.map((i) => i.label)),
		).toEqual([
			["Nouveau grafcet", "Nouveau ladder", "Nouvelle page HMI"],
			["Configuration matérielle", "Configuration scène 3D"],
			["Énoncé de l'exercice"],
			["Partager", "Gérer le partage"],
			["Propriétés"],
		]);
	});

	it("n'expose l'item 'Énoncé de l'exercice' que si l'énoncé est non vide (trim)", () => {
		expect(
			setup(ProjectMode.DESIGN)
				.result.current.items.flat()
				.map((i) => i.label),
		).not.toContain("Énoncé de l'exercice");

		expect(
			setup(ProjectMode.DESIGN, false, "   \n ")
				.result.current.items.flat()
				.map((i) => i.label),
		).not.toContain("Énoncé de l'exercice");

		const { result } = setup(ProjectMode.DESIGN, false, "## Consignes");
		const item = result.current.items
			.flat()
			.find((i) => i.label === "Énoncé de l'exercice");
		expect(item).toBeDefined();
		act(() => item?.onClick?.());
		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "exercise",
			type: "exercise",
			title: "Énoncé de l'exercice",
		});
	});

	it("creates a new grafcet when designing", () => {
		const { result } = setup(ProjectMode.DESIGN);
		act(() => result.current.items[0][0].onClick?.());
		expect(grafcetsManager.newGrafcet).toHaveBeenCalled();
	});

	it("creates a new HMI page when designing", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const item = result.current.items[0].find(
			(i) => i.label === "Nouvelle page HMI",
		);
		expect(item).toBeDefined();
		act(() => item?.onClick?.());
		expect(hmiManager.newHmiPage).toHaveBeenCalled();
	});

	it("disables the new HMI page item outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		const item = result.current.items[0].find(
			(i) => i.label === "Nouvelle page HMI",
		);
		expect(item?.disabled).toBe(true);
		act(() => item?.onClick?.());
		expect(hmiManager.newHmiPage).not.toHaveBeenCalled();
	});

	it("disables and ignores new grafcet outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		expect(result.current.items[0][0].disabled).toBe(true);

		act(() => result.current.items[0][0].onClick?.());
		expect(grafcetsManager.newGrafcet).not.toHaveBeenCalled();
	});

	it("opens the 3D scene configuration page regardless of mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		act(() =>
			groupOf(result.current.items, "Configuration scène 3D")[1].onClick?.(),
		);
		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "scene3d-configuration",
			type: "scene3d-configuration",
			title: "Configuration scène 3D",
		});
	});

	it("opens the project properties page regardless of mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		act(() => groupOf(result.current.items, "Propriétés")[0].onClick?.());
		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "project-properties",
			type: "project-properties",
			title: "Propriétés",
		});
	});

	it("opens the hardware configuration page regardless of mode", () => {
		for (const mode of [ProjectMode.DESIGN, ProjectMode.SIMULATION]) {
			pagesManager.openPage.mockClear();
			const { result } = setup(mode);
			expect(
				groupOf(result.current.items, "Configuration matérielle")[0].disabled,
			).toBeFalsy();
			act(() =>
				groupOf(
					result.current.items,
					"Configuration matérielle",
				)[0].onClick?.(),
			);
			expect(pagesManager.openPage).toHaveBeenCalledWith({
				id: "hardware-configuration",
				type: "hardware-configuration",
				title: "Configuration matérielle",
			});
		}
	});

	describe("groupe Partager", () => {
		it("expose l'item 'Partager' dans le deuxième groupe", () => {
			const { result } = setup(ProjectMode.DESIGN);
			const partagerItem = groupOf(result.current.items, "Partager")[0];
			expect(partagerItem.label).toBe("Partager");
		});

		it("appelle shareProject au clic sur 'Partager'", () => {
			const { result } = setup(ProjectMode.DESIGN);
			act(() => groupOf(result.current.items, "Partager")[0].onClick?.());
			expect(shareProject).toHaveBeenCalled();
		});

		it("désactive 'Partager' si le projet est partagé (lecture seule)", () => {
			const { result } = setup(ProjectMode.DESIGN, true);
			expect(groupOf(result.current.items, "Partager")[0].disabled).toBe(true);
		});

		it("expose 'Gérer le partage' quand le projet n'est pas partagé", () => {
			const { result } = setup(ProjectMode.DESIGN, false);
			const labels = groupOf(result.current.items, "Partager").map(
				(i) => i.label,
			);
			expect(labels).toContain("Gérer le partage");
		});

		it("n'expose pas 'Gérer le partage' quand isSharedProject est true", () => {
			const { result } = setup(ProjectMode.DESIGN, true);
			const labels = groupOf(result.current.items, "Partager").map(
				(i) => i.label,
			);
			expect(labels).not.toContain("Gérer le partage");
		});

		it("appelle setShareModalVisible au clic sur 'Gérer le partage'", () => {
			const { result } = setup(ProjectMode.DESIGN, false);
			const gerItem = groupOf(result.current.items, "Partager").find(
				(i) => i.label === "Gérer le partage",
			);
			act(() => gerItem?.onClick?.());
			expect(setShareModalVisible).toHaveBeenCalledWith(true);
		});
	});
});
