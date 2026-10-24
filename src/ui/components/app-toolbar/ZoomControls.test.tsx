/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import ZoomControls from "./ZoomControls";

function setup(props: Partial<React.ComponentProps<typeof ZoomControls>> = {}) {
	const onZoomIn = jest.fn();
	const onZoomOut = jest.fn();
	render(
		<ZoomControls
			zoom={1}
			zoomInLabel="Zoomer"
			zoomOutLabel="Dézoomer"
			canZoomIn
			canZoomOut
			onZoomIn={onZoomIn}
			onZoomOut={onZoomOut}
			{...props}
		/>,
	);
	return { onZoomIn, onZoomOut };
}

describe("ZoomControls", () => {
	it("place le zoom arrière à gauche, le niveau au centre et le zoom avant à droite", () => {
		setup({ zoom: 0.5 });

		const out = screen.getByLabelText("Dézoomer");
		const level = screen.getByText("50%");
		const zoomIn = screen.getByLabelText("Zoomer");
		expect(out.compareDocumentPosition(level)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(level.compareDocumentPosition(zoomIn)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
	});

	it("arrondit le niveau au pourcent", () => {
		setup({ zoom: 0.8333 });
		expect(screen.getByText("83%")).toBeInTheDocument();
	});

	it("laisse le niveau vide tant que le zoom est inconnu", () => {
		setup({ zoom: null });
		expect(screen.queryByText(/%/)).not.toBeInTheDocument();
	});

	it("appelle les actions de zoom au clic", () => {
		const { onZoomIn, onZoomOut } = setup();

		fireEvent.click(screen.getByLabelText("Zoomer"));
		fireEvent.click(screen.getByLabelText("Dézoomer"));

		expect(onZoomIn).toHaveBeenCalledTimes(1);
		expect(onZoomOut).toHaveBeenCalledTimes(1);
	});

	it("n'appelle pas une action désactivée", () => {
		const { onZoomIn, onZoomOut } = setup({
			canZoomIn: false,
			canZoomOut: false,
		});

		fireEvent.click(screen.getByLabelText("Zoomer"));
		fireEvent.click(screen.getByLabelText("Dézoomer"));

		expect(onZoomIn).not.toHaveBeenCalled();
		expect(onZoomOut).not.toHaveBeenCalled();
	});

	it("appelle onLevelClick au clic sur le niveau, quand il est fourni", () => {
		const onLevelClick = jest.fn();
		setup({ onLevelClick });

		fireEvent.click(screen.getByText("100%"));

		expect(onLevelClick).toHaveBeenCalledTimes(1);
	});

	it("préfixe les classes des outils", () => {
		setup({ toolNamePrefix: "hmi-" });
		expect(document.querySelector(".app-toolbar__hmi-zoom-in")).not.toBeNull();
		expect(document.querySelector(".app-toolbar__hmi-zoom-out")).not.toBeNull();
	});
});
