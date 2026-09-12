/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import LadderSystemBlockTool from "./LadderSystemBlockTool";

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
		<LadderSystemBlockTool
			blockType="compare"
			disabled={disabled}
			label={label}
		>
			<span>contenu</span>
		</LadderSystemBlockTool>,
	);
}

function tool(): HTMLElement {
	return screen.getByText("contenu").parentElement as HTMLElement;
}

describe("LadderSystemBlockTool", () => {
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

	it("porte le blockType en DataTransfer natif au dragstart, comme le glisser depuis l'explorateur", () => {
		setup();
		const dataTransfer = {
			effectAllowed: "",
			setData: jest.fn(),
		} as unknown as DataTransfer;

		fireEvent.dragStart(tool(), { dataTransfer });

		expect(dataTransfer.effectAllowed).toBe("copy");
		expect(dataTransfer.setData).toHaveBeenCalledWith(
			LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
			"compare",
		);
	});

	describe("tooltip", () => {
		it("affiche le tooltip au survol quand label est fourni", async () => {
			setup({ label: "Bloc Compare — compare deux valeurs" });

			fireEvent.mouseOver(tool());

			expect(await screen.findByRole("tooltip")).toHaveTextContent(
				"Bloc Compare — compare deux valeurs",
			);
		});

		it("n'affiche pas de tooltip quand label est absent", () => {
			setup();
			expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		});
	});
});
