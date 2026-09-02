/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import PagesTabBar from "./PagesTabBar";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	activePageId = "p1",
	setActivePage = jest.fn(),
}: { activePageId?: string; setActivePage?: jest.Mock } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pagesManager: { setActivePage },
			activePageId,
			project: { ladders: {} },
			pagesData: {
				p1: { title: "Grafcet 1", type: "grafcet" },
				p2: { title: "Variables", type: "variables" },
			},
			pagesOrder: ["p1", "p2"],
		}),
	);
	renderWithI18n(<PagesTabBar />);
	return { setActivePage };
}

describe("PagesTabBar — accessibilité des onglets", () => {
	it("expose une tablist et des onglets avec aria-selected", () => {
		setup({ activePageId: "p1" });

		expect(
			screen.getByRole("tablist", { name: "Onglets ouverts" }),
		).toBeInTheDocument();

		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(2);
		expect(screen.getByRole("tab", { name: /Grafcet 1/ })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("tab", { name: /Variables/ })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("active l'onglet sur Entrée et Espace", () => {
		const { setActivePage } = setup({ activePageId: "p1" });
		const variablesTab = screen.getByRole("tab", { name: /Variables/ });

		fireEvent.keyDown(variablesTab, { key: "Enter" });
		fireEvent.keyDown(variablesTab, { key: " " });

		expect(setActivePage).toHaveBeenCalledTimes(2);
		expect(setActivePage).toHaveBeenCalledWith("p2");
	});
});
