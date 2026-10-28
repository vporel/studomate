/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import FloatingBox from "./FloatingBox";

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
	onClose = jest.fn(),
	position = null as { x: number; y: number } | null,
	onPositionChange = jest.fn(),
	top,
	width,
}: {
	onClose?: jest.Mock;
	position?: { x: number; y: number } | null;
	onPositionChange?: jest.Mock;
	top?: number;
	width?: number;
} = {}) {
	const view = render(
		<div data-testid="parent" style={{ position: "relative" }}>
			<FloatingBox
				title="Blocs systèmes"
				closeLabel="Fermer"
				position={position}
				onPositionChange={onPositionChange}
				onClose={onClose}
				top={top}
				width={width}
			>
				<p>contenu</p>
			</FloatingBox>
		</div>,
	);
	return { onClose, onPositionChange, ...view };
}

describe("FloatingBox", () => {
	it("se présente comme une boîte non modale intitulée par son titre, avec son contenu", () => {
		setup();
		const box = screen.getByRole("dialog", { name: "Blocs systèmes" });
		expect(box).not.toHaveAttribute("aria-modal", "true");
		expect(screen.getByText("contenu")).toBeInTheDocument();
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

	it("applique la largeur demandée", () => {
		setup({ width: 320 });
		expect(screen.getByRole("dialog")).toHaveStyle({ width: "320px" });
	});

	describe("position d'ouverture", () => {
		afterEach(() => jest.restoreAllMocks());

		it("s'ouvre en haut à droite de son conteneur, à `top` de son bord supérieur", () => {
			mockSizes();
			const { onPositionChange } = setup({ top: 46 });

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
			setup({ top: 46 });
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
			setup({ top: 46 });

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
			const { onPositionChange } = setup({ top: 46 });
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
			const { onPositionChange } = setup({ top: 46 });
			onPositionChange.mockClear();

			fireEvent.pointerUp(header());

			expect(onPositionChange).not.toHaveBeenCalled();
		});

		it("ne bouge plus une fois le pointeur relâché", () => {
			mockSizes();
			setup({ top: 46 });
			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerUp(header());
			const left = getComputedStyle(box()).left;

			fireEvent.pointerMove(header(), { clientX: 300, clientY: 300 });

			expect(getComputedStyle(box()).left).toBe(left);
		});

		it("ne démarre pas un déplacement depuis le bouton de fermeture", () => {
			mockSizes();
			setup({ top: 46 });
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
