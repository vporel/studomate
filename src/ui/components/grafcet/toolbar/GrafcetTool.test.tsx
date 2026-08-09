/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetTool from "./GrafcetTool";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({ mode = ProjectMode.DESIGN, disabled = false } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(selectorImplementation({ mode }));

	render(
		<GrafcetToolbarDnDProvider>
			<GrafcetTool element={{ type: "step", extraData: {} }} disabled={disabled}>
				<span>contenu</span>
			</GrafcetTool>
		</GrafcetToolbarDnDProvider>,
	);
}

describe("GrafcetTool", () => {
	it("porte une classe reflétant le type de l'élément", () => {
		setup();
		expect(document.querySelector(".grafcet-toolbar__step")).toBeInTheDocument();
	});

	it("est activé en mode DESIGN", () => {
		setup({ mode: ProjectMode.DESIGN });
		expect(document.querySelector(".grafcet-toolbar__tool--disabled")).not.toBeInTheDocument();
	});

	it("se désactive hors du mode DESIGN, quel que soit `disabled`", () => {
		setup({ mode: ProjectMode.SIMULATION, disabled: false });
		expect(document.querySelector(".grafcet-toolbar__tool--disabled")).toBeInTheDocument();
	});

	it("se désactive quand `disabled` est explicitement vrai", () => {
		setup({ mode: ProjectMode.DESIGN, disabled: true });
		expect(document.querySelector(".grafcet-toolbar__tool--disabled")).toBeInTheDocument();
	});

	it("n'est pas draggable quand désactivé", () => {
		setup({ disabled: true });
		expect(screen.getByText("contenu").closest(".grafcet-toolbar__tool")).toHaveAttribute(
			"draggable",
			"false",
		);
	});

	it("est draggable quand activé, et prépare le transfert au dragstart", () => {
		setup({ disabled: false });
		const tool = screen.getByText("contenu").closest(".grafcet-toolbar__tool")!;
		expect(tool).toHaveAttribute("draggable", "true");

		const dataTransfer = { effectAllowed: "" } as unknown as DataTransfer;
		fireEvent.dragStart(tool, { dataTransfer });

		expect(dataTransfer.effectAllowed).toBe("move");
	});
});
