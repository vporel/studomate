/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import GrafcetTool from "./GrafcetTool";
import { GrafcetToolbarDnDProvider } from "./GrafcetToolbarDnDContext";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/grafcet/context/GrafcetContext");

function setup({
	mode = ProjectMode.DESIGN,
	editingEnabled = true,
	disabled = false,
	zoom = null as number | null,
	elementType = "step" as "step" | "transition",
} = {}) {
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ zoom }),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode, editingEnabled }),
	);

	render(
		<GrafcetToolbarDnDProvider>
			<GrafcetTool
				element={
					elementType === "step"
						? { type: "step", extraData: {} }
						: { type: "transition" }
				}
				disabled={disabled}
			>
				<span>contenu</span>
			</GrafcetTool>
		</GrafcetToolbarDnDProvider>,
	);
}

describe("GrafcetTool", () => {
	it("porte une classe reflétant le type de l'élément", () => {
		setup();
		expect(
			document.querySelector(".grafcet-toolbar__step"),
		).toBeInTheDocument();
	});

	it("est activé en mode DESIGN", () => {
		setup({ mode: ProjectMode.DESIGN });
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).not.toBeInTheDocument();
	});

	it("se désactive hors du mode DESIGN, quel que soit `disabled`", () => {
		setup({ mode: ProjectMode.SIMULATION, disabled: false });
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});

	it("se désactive sur un projet en lecture seule, même en conception", () => {
		setup({ mode: ProjectMode.DESIGN, editingEnabled: false });
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});

	it("se désactive quand `disabled` est explicitement vrai", () => {
		setup({ mode: ProjectMode.DESIGN, disabled: true });
		expect(
			document.querySelector(".grafcet-toolbar__tool--disabled"),
		).toBeInTheDocument();
	});

	it("n'est pas draggable quand désactivé", () => {
		setup({ disabled: true });
		expect(
			screen.getByText("contenu").closest(".grafcet-toolbar__tool"),
		).toHaveAttribute("draggable", "false");
	});

	it("est draggable quand activé, et prépare le transfert au dragstart", () => {
		setup({ disabled: false });
		const tool = screen.getByText("contenu").closest(".grafcet-toolbar__tool")!;
		expect(tool).toHaveAttribute("draggable", "true");

		const dataTransfer = {
			effectAllowed: "",
			setDragImage: jest.fn(),
		} as unknown as DataTransfer;
		fireEvent.dragStart(tool, { dataTransfer });

		expect(dataTransfer.effectAllowed).toBe("move");
	});

	describe("drag preview", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => {
			jest.runAllTimers();
			jest.useRealTimers();
		});

		function dragPreviewOf(options: Parameters<typeof setup>[0]) {
			setup(options);
			const tool = document.querySelector(".grafcet-toolbar__tool")!;
			const setDragImage = jest.fn();
			fireEvent.dragStart(tool, {
				dataTransfer: { effectAllowed: "", setDragImage },
			});
			const [element, offsetX, offsetY] = setDragImage.mock.calls[0];
			return { element: element as HTMLElement, offsetX, offsetY };
		}

		it("has the size of the element, at the zoom of the flow", () => {
			const { element, offsetX, offsetY } = dragPreviewOf({
				zoom: 2,
				elementType: "transition",
			});

			// transition: 40 x 30, plus a 2px margin on each side
			expect(element.style.width).toBe("88px");
			expect(element.style.height).toBe("68px");
			expect(offsetX).toBe(44);
			expect(offsetY).toBe(34);
		});

		it("shows a drawing of the element being created", () => {
			const { element } = dragPreviewOf({ zoom: 1 });

			expect(element.querySelector("svg")).not.toBeNull();
		});

		it("has the real size of the element when the zoom is not known yet", () => {
			const { element } = dragPreviewOf({ zoom: null });

			// step: 40 x 40, plus a 2px margin on each side
			expect(element.style.width).toBe("44px");
			expect(element.style.height).toBe("44px");
		});
	});
});
