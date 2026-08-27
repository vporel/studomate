/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderTool from "./LadderTool";
import { LadderToolbarDnDProvider } from "./LadderToolbarDnDContext";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	mode = ProjectMode.DESIGN,
	disabled = false,
	label,
}: { mode?: ProjectMode; disabled?: boolean; label?: string } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode }),
	);

	render(
		<LadderToolbarDnDProvider>
			<LadderTool
				element={{ type: "contact", mode: "NO" }}
				disabled={disabled}
				label={label}
			>
				<span>contenu</span>
			</LadderTool>
		</LadderToolbarDnDProvider>,
	);
}

function tool(): HTMLElement {
	return screen.getByText("contenu").parentElement as HTMLElement;
}

describe("LadderTool", () => {
	it("est draggable et actif en mode DESIGN", () => {
		setup({ mode: ProjectMode.DESIGN, disabled: false });
		expect(tool()).toHaveAttribute("draggable", "true");
	});

	it("n'est pas draggable hors du mode DESIGN", () => {
		setup({ mode: ProjectMode.SIMULATION, disabled: false });
		expect(tool()).toHaveAttribute("draggable", "false");
	});

	it("n'est pas draggable quand `disabled` est vrai", () => {
		setup({ mode: ProjectMode.DESIGN, disabled: true });
		expect(tool()).toHaveAttribute("draggable", "false");
	});

	it("prépare le transfert (copy) au dragstart", () => {
		setup();
		const dataTransfer = { effectAllowed: "" } as unknown as DataTransfer;

		fireEvent.dragStart(tool(), { dataTransfer });

		expect(dataTransfer.effectAllowed).toBe("copy");
	});

	describe("tooltip", () => {
		it("affiche le tooltip au survol quand label est fourni", async () => {
			setup({ label: "Contact normalement ouvert (NO)" });

			fireEvent.mouseOver(tool());

			expect(await screen.findByRole("tooltip")).toHaveTextContent(
				"Contact normalement ouvert (NO)",
			);
		});

		it("n'affiche pas de tooltip quand label est absent", () => {
			setup();
			// Sans label, aucun élément tooltip ne doit être présent dans le DOM
			expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		});
	});
});
