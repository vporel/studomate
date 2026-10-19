/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import Project from "@/schemas/project/project.schema";
import HmiPagePropertiesPanel from "./HmiPagePropertiesPanel";

jest.mock("@/ui/components/projects/ProjectContext");

const setMainHmiPage = jest.fn();

const setup = (
	options: {
		mainIndex?: number | null;
		panelIndex?: number;
		locale?: "fr" | "en";
	} = {},
) => {
	const { mainIndex = 1, panelIndex = 1, locale } = options;
	const project = new Project("p1", "Projet", "");
	const pages = [
		project.createHmiPage("Vue 1"),
		project.createHmiPage("Vue 2"),
		project.createHmiPage("Vue 3"),
	];
	if (mainIndex === null) pages.forEach((page) => (page.isMain = false));
	else project.setMainHmiPage(pages[mainIndex].id);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			hmiManager: { setMainHmiPage },
			project,
		}),
	);
	renderWithI18n(<HmiPagePropertiesPanel hmiPageId={pages[panelIndex].id} />, {
		locale,
	});
	return pages;
};

describe("HmiPagePropertiesPanel", () => {
	afterEach(() => jest.clearAllMocks());

	it("désigne la page comme principale au clic", () => {
		const pages = setup({ mainIndex: 0, panelIndex: 1 });

		expect(
			screen.getByText("Aucun widget sélectionné : propriétés de la page."),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Définir en page principale" }),
		);

		expect(setMainHmiPage).toHaveBeenCalledWith(pages[1].id);
	});

	it("désactive le bouton sur la page déjà principale", () => {
		setup({ mainIndex: 1, panelIndex: 1 });

		expect(
			screen.getByRole("button", { name: "Définir en page principale" }),
		).toBeDisabled();
	});

	it("sans page marquée principale, la première page est traitée comme principale", () => {
		setup({ mainIndex: null, panelIndex: 0 });

		expect(
			screen.getByRole("button", { name: "Définir en page principale" }),
		).toBeDisabled();
	});

	it("sans page marquée principale, une autre page peut être définie principale", () => {
		setup({ mainIndex: null, panelIndex: 1 });

		expect(
			screen.getByRole("button", { name: "Définir en page principale" }),
		).toBeEnabled();
	});

	it("traduit ses textes en anglais", () => {
		setup({ locale: "en" });

		expect(
			screen.getByText("No widget selected: page properties."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Set as main page" }),
		).toBeInTheDocument();
	});
});
