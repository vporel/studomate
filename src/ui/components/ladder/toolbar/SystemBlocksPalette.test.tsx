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

function mockSizes() {
	jest
		.spyOn(HTMLElement.prototype, "clientWidth", "get")
		.mockImplementation(() => 600);
	jest
		.spyOn(HTMLElement.prototype, "clientHeight", "get")
		.mockImplementation(() => 400);
	jest
		.spyOn(HTMLElement.prototype, "offsetWidth", "get")
		.mockImplementation(() => 200);
	jest
		.spyOn(HTMLElement.prototype, "offsetHeight", "get")
		.mockImplementation(() => 150);
	jest
		.spyOn(HTMLElement.prototype, "offsetParent", "get")
		.mockImplementation(function (this: HTMLElement) {
			return this.parentElement;
		});
	HTMLElement.prototype.setPointerCapture = jest.fn();
	//jsdom has no PointerEvent: without it, the pointer coordinates are dropped.
	(window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent =
		MouseEvent;
}

function setup({
	mode = ProjectMode.DESIGN,
	editingEnabled = true,
	onClose = jest.fn(),
	position = null as { x: number; y: number } | null,
	onPositionChange = jest.fn(),
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode, editingEnabled }),
	);
	const view = renderWithI18n(
		<div data-testid="parent" style={{ position: "relative" }}>
			<SystemBlocksPalette
				position={position}
				onPositionChange={onPositionChange}
				onClose={onClose}
			/>
		</div>,
	);
	return { onClose, onPositionChange, ...view };
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

	describe("position d'ouverture", () => {
		afterEach(() => jest.restoreAllMocks());

		it("s'ouvre en haut à droite de son conteneur, sous la barre d'outils", () => {
			mockSizes();
			const { onPositionChange } = setup();

			expect(screen.getByRole("dialog")).toHaveStyle({
				left: `${600 - 200 - 8}px`,
				top: "46px",
			});
			expect(onPositionChange).toHaveBeenCalledWith({ x: 392, y: 46 });
		});

		it("s'ouvre à la position retenue, sans la recalculer", () => {
			mockSizes();
			const { onPositionChange } = setup({ position: { x: 30, y: 120 } });

			expect(screen.getByRole("dialog")).toHaveStyle({
				left: "30px",
				top: "120px",
			});
			expect(onPositionChange).toHaveBeenCalledWith({ x: 30, y: 120 });
		});

		it("ramène dans son conteneur une position retenue devenue hors limites", () => {
			mockSizes();
			const { onPositionChange } = setup({ position: { x: 900, y: 900 } });

			expect(screen.getByRole("dialog")).toHaveStyle({
				left: `${600 - 200}px`,
				top: `${400 - 150}px`,
			});
			expect(onPositionChange).toHaveBeenCalledWith({ x: 400, y: 250 });
		});
	});

	describe("déplacement par l'en-tête", () => {
		afterEach(() => jest.restoreAllMocks());

		const header = () => screen.getByText("Blocs systèmes").parentElement!;
		const box = () => screen.getByRole("dialog");

		it("suit le pointeur à partir du point saisi", () => {
			mockSizes();
			setup();
			const startLeft = parseInt(getComputedStyle(box()).left);
			const startTop = parseInt(getComputedStyle(box()).top);

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 40, clientY: 70 });
			fireEvent.pointerUp(header());

			expect(box()).toHaveStyle({
				left: `${startLeft - 60}px`,
				top: `${startTop - 30}px`,
			});
		});

		it("reste dans les limites de son conteneur", () => {
			mockSizes();
			setup();

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 5000, clientY: 5000 });
			expect(box()).toHaveStyle({
				left: `${600 - 200}px`,
				top: `${400 - 150}px`,
			});

			fireEvent.pointerMove(header(), { clientX: -5000, clientY: -5000 });
			expect(box()).toHaveStyle({ left: "0px", top: "0px" });
		});

		it("ne signale sa position qu'à la fin du déplacement, pas à chaque mouvement", () => {
			mockSizes();
			const { onPositionChange } = setup();
			onPositionChange.mockClear();

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 70, clientY: 90 });
			fireEvent.pointerMove(header(), { clientX: 40, clientY: 80 });
			expect(onPositionChange).not.toHaveBeenCalled();

			fireEvent.pointerUp(header());
			expect(onPositionChange).toHaveBeenCalledTimes(1);
			expect(onPositionChange).toHaveBeenCalledWith({ x: 332, y: 26 });
		});

		it("ne signale rien quand le pointeur est relâché sans avoir saisi l'en-tête", () => {
			mockSizes();
			const { onPositionChange } = setup();
			onPositionChange.mockClear();

			fireEvent.pointerUp(header());

			expect(onPositionChange).not.toHaveBeenCalled();
		});

		it("ne bouge plus une fois le pointeur relâché", () => {
			mockSizes();
			setup();
			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerUp(header());
			const left = getComputedStyle(box()).left;

			fireEvent.pointerMove(header(), { clientX: 300, clientY: 300 });

			expect(getComputedStyle(box()).left).toBe(left);
		});

		it("ne démarre pas un déplacement depuis le bouton de fermeture", () => {
			mockSizes();
			setup();
			const left = getComputedStyle(box()).left;

			fireEvent.pointerDown(screen.getByLabelText("Fermer"), {
				clientX: 100,
				clientY: 100,
			});
			fireEvent.pointerMove(header(), { clientX: 300, clientY: 300 });

			expect(getComputedStyle(box()).left).toBe(left);
		});
	});
});
