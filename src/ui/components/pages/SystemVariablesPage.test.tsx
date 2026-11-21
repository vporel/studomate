/** @jest-environment jsdom */
import { SYSTEM_VARIABLES } from "@/schemas/variable/system-variables";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SystemVariablesPage from "./SystemVariablesPage";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(activePageId = "system-variables") {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ activePageId }),
	);
	return renderWithI18n(<SystemVariablesPage />);
}

describe("SystemVariablesPage", () => {
	it("shows the translated title and the introduction", () => {
		setup();
		expect(
			screen.getByRole("heading", { name: "Variables système" }),
		).toBeInTheDocument();
		expect(screen.getByText(/Fournies par le moteur/)).toBeInTheDocument();
	});

	it("shows the column headers", () => {
		setup();
		for (const name of ["Nom", "Type", "Description"]) {
			expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
		}
	});

	it("lists every system variable with its name, type and description", () => {
		setup();
		const rows = screen.getAllByRole("row").slice(1);
		expect(rows).toHaveLength(SYSTEM_VARIABLES.length);
		SYSTEM_VARIABLES.forEach((variable, index) => {
			const cells = within(rows[index]).getAllByRole("cell");
			expect(cells[0]).toHaveTextContent(variable.name);
			expect(cells[1]).toHaveTextContent(variable.type);
			expect(cells[2].textContent).not.toBe("");
			expect(cells[2].textContent).not.toContain("items.");
		});
	});

	it("is read-only: no input or button", () => {
		setup();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("is displayed only while its page is active", () => {
		const { container, unmount } = setup("system-variables");
		expect(container.querySelector("#page-system-variables")).toHaveStyle({
			display: "flex",
		});
		unmount();
		const other = setup("grafcet-1");
		expect(other.container.querySelector("#page-system-variables")).toHaveStyle(
			{ display: "none" },
		);
	});
});
