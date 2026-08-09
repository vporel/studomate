/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useProjectStore } from "../projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Page from "./Page";

jest.mock("../projects/ProjectContext");

function setup(activePageId: string | null) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(selectorImplementation({ activePageId }));
	return render(
		<Page pageId="grafcet-1">
			<div>contenu</div>
		</Page>,
	);
}

describe("Page", () => {
	it("affiche la page (display: flex) quand elle est active", () => {
		const { container } = setup("grafcet-1");
		expect(container.querySelector("#page-grafcet-1")).toHaveStyle({ display: "flex" });
	});

	it("masque la page (display: none) quand un autre onglet est actif", () => {
		const { container } = setup("some-other-page");
		expect(container.querySelector("#page-grafcet-1")).toHaveStyle({ display: "none" });
	});

	it("porte l'id DOM page-<pageId>, utilisé par focusFlow", () => {
		const { container } = setup("grafcet-1");
		expect(container.querySelector("#page-grafcet-1")).toBeInTheDocument();
	});
});
