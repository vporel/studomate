/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
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

/** Lets the pending animation frame of a move or a resize run. */
async function nextFrame() {
	await act(
		() =>
			new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
	);
}

function setup({
	onClose = jest.fn(),
	position = null as { x: number; y: number } | null,
	onPositionChange = jest.fn(),
	top,
	width,
	resizable,
	height,
	size,
	onSizeChange = jest.fn(),
	minWidth,
	minHeight,
	actions,
}: {
	onClose?: jest.Mock;
	position?: { x: number; y: number } | null;
	onPositionChange?: jest.Mock;
	top?: number;
	width?: number;
	resizable?: boolean;
	height?: number;
	size?: { width: number; height: number } | null;
	onSizeChange?: jest.Mock;
	minWidth?: number;
	minHeight?: number;
	actions?: React.ReactNode;
} = {}) {
	const view = render(
		<div data-testid="parent" style={{ position: "relative" }}>
			<FloatingBox
				title="Bibliothèque"
				closeLabel="Fermer"
				position={position}
				onPositionChange={onPositionChange}
				onClose={onClose}
				top={top}
				width={width}
				height={height}
				size={size}
				onSizeChange={onSizeChange}
				resizable={resizable}
				minWidth={minWidth}
				minHeight={minHeight}
				actions={actions}
			>
				<p>contenu</p>
			</FloatingBox>
		</div>,
	);
	return { onClose, onPositionChange, onSizeChange, ...view };
}

describe("FloatingBox", () => {
	it("se présente comme une boîte non modale intitulée par son titre, avec son contenu", () => {
		setup();
		const box = screen.getByRole("dialog", { name: "Bibliothèque" });
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

		const header = () => screen.getByText("Bibliothèque").parentElement!;
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

		it("reste dans les limites de son conteneur", async () => {
			mockSizes();
			setup({ top: 46 });

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 5000, clientY: 5000 });
			await nextFrame();
			expect(box()).toHaveStyle({
				left: `${600 - 200}px`,
				top: `${400 - 150}px`,
			});

			fireEvent.pointerMove(header(), { clientX: -5000, clientY: -5000 });
			await nextFrame();
			expect(box()).toHaveStyle({ left: "0px", top: "0px" });
		});

		it("suit le pointeur pendant le déplacement, une fois par image", async () => {
			mockSizes();
			setup({ position: { x: 100, y: 100 } });

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 120, clientY: 110 });
			fireEvent.pointerMove(header(), { clientX: 150, clientY: 130 });
			expect(box()).toHaveStyle({ left: "100px", top: "100px" });

			await nextFrame();
			expect(box()).toHaveStyle({ left: "150px", top: "130px" });
		});

		it("garde la position finale une fois le pointeur relâché avant l'image suivante", async () => {
			mockSizes();
			setup({ position: { x: 100, y: 100 } });

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 150, clientY: 130 });
			fireEvent.pointerUp(header());
			expect(box()).toHaveStyle({ left: "150px", top: "130px" });

			await nextFrame();
			expect(box()).toHaveStyle({ left: "150px", top: "130px" });
		});

		it("annule l'image en attente quand la boîte disparaît pendant un déplacement", () => {
			mockSizes();
			const cancel = jest.spyOn(window, "cancelAnimationFrame");
			const { unmount } = setup({ position: { x: 100, y: 100 } });

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 150, clientY: 130 });
			unmount();

			expect(cancel).toHaveBeenCalledTimes(1);
		});

		it("reprend le déplacement suivant à la position où le précédent s'est arrêté", () => {
			mockSizes();
			setup({ position: { x: 100, y: 100 } });

			fireEvent.pointerDown(header(), { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header(), { clientX: 150, clientY: 130 });
			fireEvent.pointerUp(header());
			fireEvent.pointerDown(header(), { clientX: 150, clientY: 130 });
			fireEvent.pointerMove(header(), { clientX: 160, clientY: 140 });
			fireEvent.pointerUp(header());

			expect(box()).toHaveStyle({ left: "160px", top: "140px" });
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

	it("renders an action of the header before the close button", () => {
		const onAction = jest.fn();
		setup({
			actions: <button type="button" aria-label="Action" onClick={onAction} />,
		});

		fireEvent.click(screen.getByLabelText("Action"));

		expect(onAction).toHaveBeenCalledTimes(1);
	});

	describe("redimensionnement", () => {
		afterEach(() => jest.restoreAllMocks());

		const handle = (direction: string) =>
			document.querySelector<HTMLElement>(
				`[data-resize-handle="${direction}"]`,
			)!;
		const box = () => screen.getByRole("dialog");
		const resizableSetup = (options: Parameters<typeof setup>[0] = {}) => {
			mockSizes();
			return setup({
				resizable: true,
				width: 300,
				height: 200,
				position: { x: 100, y: 100 },
				...options,
			});
		};
		const drag = (
			direction: string,
			dx: number,
			dy: number,
			release = true,
		) => {
			fireEvent.pointerDown(handle(direction), { clientX: 0, clientY: 0 });
			fireEvent.pointerMove(handle(direction), { clientX: dx, clientY: dy });
			if (release) fireEvent.pointerUp(handle(direction));
		};

		it("offre une poignée sur chacun des quatre côtés et des quatre coins", () => {
			resizableSetup();
			const directions = [...document.querySelectorAll("[data-resize-handle]")]
				.map((element) => element.getAttribute("data-resize-handle"))
				.sort();
			expect(directions).toEqual(["e", "n", "ne", "nw", "s", "se", "sw", "w"]);
		});

		it("n'offre aucune poignée sans la prop resizable", () => {
			mockSizes();
			setup({ width: 300 });
			expect(document.querySelector("[data-resize-handle]")).toBeNull();
		});

		it("prend la largeur et la hauteur demandées, ou la taille retenue", () => {
			resizableSetup();
			expect(box()).toHaveStyle({ width: "300px", height: "200px" });
		});

		it("préfère la taille retenue à la taille demandée", () => {
			resizableSetup({ size: { width: 420, height: 310 } });
			expect(box()).toHaveStyle({ width: "420px", height: "310px" });
		});

		it("signale sa taille à l'ouverture", () => {
			const { onSizeChange } = resizableSetup();
			expect(onSizeChange).toHaveBeenCalledWith({ width: 300, height: 200 });
		});

		it("ramène dans son conteneur une taille retenue devenue trop grande", () => {
			const { onSizeChange } = resizableSetup({
				size: { width: 900, height: 900 },
				position: { x: 0, y: 0 },
			});
			expect(box()).toHaveStyle({ width: "600px", height: "400px" });
			expect(onSizeChange).toHaveBeenCalledWith({ width: 600, height: 400 });
		});

		it("ne descend pas sous la taille minimale à l'ouverture", () => {
			resizableSetup({
				size: { width: 20, height: 20 },
				minWidth: 150,
				minHeight: 90,
			});
			expect(box()).toHaveStyle({ width: "150px", height: "90px" });
		});

		it("se redimensionne par le coin bas droit sans bouger", () => {
			const { onPositionChange, onSizeChange } = resizableSetup();
			onPositionChange.mockClear();
			onSizeChange.mockClear();

			drag("se", 50, 30);

			expect(box()).toHaveStyle({
				width: "350px",
				height: "230px",
				left: "100px",
				top: "100px",
			});
			expect(onSizeChange).toHaveBeenCalledWith({ width: 350, height: 230 });
			expect(onPositionChange).toHaveBeenCalledWith({ x: 100, y: 100 });
		});

		it("se redimensionne par le coin haut gauche en gardant le coin opposé fixe", () => {
			const { onPositionChange, onSizeChange } = resizableSetup();
			onPositionChange.mockClear();
			onSizeChange.mockClear();

			drag("nw", -40, -20);

			expect(box()).toHaveStyle({
				width: "340px",
				height: "220px",
				left: "60px",
				top: "80px",
			});
			expect(onSizeChange).toHaveBeenCalledWith({ width: 340, height: 220 });
			expect(onPositionChange).toHaveBeenCalledWith({ x: 60, y: 80 });
		});

		it.each([
			[
				"e",
				40,
				0,
				{ width: "340px", height: "200px", left: "100px", top: "100px" },
			],
			[
				"w",
				-40,
				0,
				{ width: "340px", height: "200px", left: "60px", top: "100px" },
			],
			[
				"s",
				0,
				40,
				{ width: "300px", height: "240px", left: "100px", top: "100px" },
			],
			[
				"n",
				0,
				-40,
				{ width: "300px", height: "240px", left: "100px", top: "60px" },
			],
			[
				"ne",
				40,
				-40,
				{ width: "340px", height: "240px", left: "100px", top: "60px" },
			],
			[
				"sw",
				-40,
				40,
				{ width: "340px", height: "240px", left: "60px", top: "100px" },
			],
		])(
			"se redimensionne par le côté ou le coin %s",
			(direction, dx, dy, style) => {
				resizableSetup();
				drag(direction, dx, dy);
				expect(box()).toHaveStyle(style);
			},
		);

		it("réduit par un côté en laissant l'autre côté en place", () => {
			resizableSetup();

			drag("w", 60, 0);

			expect(box()).toHaveStyle({ width: "240px", left: "160px" });
		});

		it("ne descend pas sous la taille minimale et ne déplace pas le côté opposé", async () => {
			resizableSetup({ minWidth: 150, minHeight: 90 });

			drag("w", 5000, 0, false);
			await nextFrame();
			expect(box()).toHaveStyle({ width: "150px", left: "250px" });
			fireEvent.pointerUp(handle("w"));

			drag("n", 0, 5000);
			expect(box()).toHaveStyle({ height: "90px", top: "210px" });
		});

		it("ne dépasse pas les limites de son conteneur", () => {
			resizableSetup();

			drag("se", 5000, 5000);
			expect(box()).toHaveStyle({
				width: `${600 - 100}px`,
				height: `${400 - 100}px`,
			});
		});

		it("ne dépasse pas le bord haut gauche de son conteneur", () => {
			resizableSetup();

			drag("nw", -5000, -5000);

			expect(box()).toHaveStyle({
				left: "0px",
				top: "0px",
				width: "400px",
				height: "300px",
			});
		});

		it("ne signale sa taille qu'à la fin du redimensionnement", () => {
			const { onSizeChange, onPositionChange } = resizableSetup();
			onSizeChange.mockClear();
			onPositionChange.mockClear();

			drag("se", 10, 10, false);
			fireEvent.pointerMove(handle("se"), { clientX: 30, clientY: 30 });
			expect(onSizeChange).not.toHaveBeenCalled();
			expect(onPositionChange).not.toHaveBeenCalled();

			fireEvent.pointerUp(handle("se"));
			expect(onSizeChange).toHaveBeenCalledTimes(1);
			expect(onSizeChange).toHaveBeenCalledWith({ width: 330, height: 230 });
		});

		it("ne bouge plus une fois le pointeur relâché", () => {
			resizableSetup();
			drag("se", 20, 20);

			fireEvent.pointerMove(handle("se"), { clientX: 300, clientY: 300 });

			expect(box()).toHaveStyle({ width: "320px", height: "220px" });
		});

		it("ne signale rien quand le pointeur est relâché sans avoir saisi une poignée", () => {
			const { onSizeChange } = resizableSetup();
			onSizeChange.mockClear();

			fireEvent.pointerUp(handle("se"));

			expect(onSizeChange).not.toHaveBeenCalled();
		});

		it("reste déplaçable par son en-tête une fois redimensionnée", () => {
			resizableSetup();
			drag("se", 20, 20);
			const header = screen.getByText("Bibliothèque").parentElement!;

			fireEvent.pointerDown(header, { clientX: 100, clientY: 100 });
			fireEvent.pointerMove(header, { clientX: 70, clientY: 90 });
			fireEvent.pointerUp(header);

			expect(box()).toHaveStyle({ left: "70px", top: "90px", width: "320px" });
		});

		it("laisse son contenu occuper la zone sous l'en-tête", () => {
			resizableSetup();
			expect(screen.getByText("contenu").parentElement).toHaveStyle({
				flex: "1",
				position: "relative",
				overflow: "hidden",
			});
		});
	});
});
