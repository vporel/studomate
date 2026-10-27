/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SystemBlocksPalette from "./SystemBlocksPalette";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	mode = ProjectMode.DESIGN,
	editingEnabled = true,
	onClose = jest.fn(),
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode, editingEnabled }),
	);
	const view = renderWithI18n(
		<div data-testid="parent" style={{ position: "relative" }}>
			<SystemBlocksPalette
				position={null}
				onPositionChange={jest.fn()}
				onClose={onClose}
			/>
		</div>,
	);
	return { onClose, ...view };
}

const item = (blockType: string) =>
	document.querySelector(`[data-block-type="${blockType}"]`) as HTMLElement;

function dragStart(element: HTMLElement) {
	const dataTransfer = { setData: jest.fn(), effectAllowed: "" };
	fireEvent.dragStart(element, { dataTransfer });
	return dataTransfer;
}

describe("SystemBlocksPalette", () => {
	it("liste tous les blocs systèmes, comme la section de l'explorateur", () => {
		setup();

		const listed = Array.from(
			document.querySelectorAll("[data-block-type]"),
		).map((li) => li.getAttribute("data-block-type"));
		expect(listed).toEqual(SYSTEM_BLOCK_CATALOG.map((e) => e.blockType));
		for (const label of [
			"Temporisation",
			"Compteur",
			"Comparaison",
			"Affectation",
			"Calcul",
			"Conversion de type",
		])
			expect(screen.getByText(label)).toBeInTheDocument();
	});

	it("se présente comme une boîte non modale intitulée « Blocs systèmes »", () => {
		setup();
		const box = screen.getByRole("dialog", { name: "Blocs systèmes" });
		expect(box).not.toHaveAttribute("aria-modal", "true");
	});

	it("transporte le type du bloc au début d'un glisser, comme l'explorateur", () => {
		setup();

		const dataTransfer = dragStart(item("timer"));

		expect(dataTransfer.setData).toHaveBeenCalledWith(
			LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
			"timer",
		);
		expect(dataTransfer.effectAllowed).toBe("copy");
	});

	it("ne se glisse pas quand le projet n'est pas modifiable", () => {
		setup({ editingEnabled: false });
		expect(item("timer")).toHaveAttribute("draggable", "false");

		setup({ mode: ProjectMode.SIMULATION });
		expect(item("counter")).toHaveAttribute("draggable", "false");
	});

	it("se glisse en conception", () => {
		setup();
		expect(item("compare")).toHaveAttribute("draggable", "true");
	});

	it("se ferme par le bouton de l'en-tête", () => {
		const { onClose } = setup();

		fireEvent.click(screen.getByLabelText("Fermer"));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("se ferme par Échap quand le focus est dans la boîte", () => {
		const { onClose } = setup();

		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
