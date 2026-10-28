/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useRef } from "react";
import useCtrlWheelZoom from "./useCtrlWheelZoom";

function Harness({
	onZoomStep,
	onChildWheel,
}: {
	onZoomStep: (direction: 1 | -1) => void;
	onChildWheel?: () => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	useCtrlWheelZoom(ref, onZoomStep);
	return (
		<div ref={ref} data-testid="area">
			<div data-testid="child" onWheel={onChildWheel} />
		</div>
	);
}

function wheel(
	element: Element,
	init: WheelEventInit,
): { defaultPrevented: boolean } {
	const event = new WheelEvent("wheel", {
		bubbles: true,
		cancelable: true,
		...init,
	});
	element.dispatchEvent(event);
	return event;
}

describe("useCtrlWheelZoom", () => {
	it("zoome en avant sur Ctrl + molette vers le haut, en arrière vers le bas", () => {
		const onZoomStep = jest.fn();
		const { getByTestId } = render(<Harness onZoomStep={onZoomStep} />);

		wheel(getByTestId("area"), { ctrlKey: true, deltaY: -100 });
		wheel(getByTestId("area"), { ctrlKey: true, deltaY: 100 });

		expect(onZoomStep.mock.calls).toEqual([[1], [-1]]);
	});

	it("accepte Cmd (metaKey) comme Ctrl", () => {
		const onZoomStep = jest.fn();
		const { getByTestId } = render(<Harness onZoomStep={onZoomStep} />);

		wheel(getByTestId("area"), { metaKey: true, deltaY: -100 });

		expect(onZoomStep).toHaveBeenCalledWith(1);
	});

	it("prend le geste sur tout l'élément, y compris au-dessus de ses enfants", () => {
		const onZoomStep = jest.fn();
		const { getByTestId } = render(<Harness onZoomStep={onZoomStep} />);

		wheel(getByTestId("child"), { ctrlKey: true, deltaY: -100 });

		expect(onZoomStep).toHaveBeenCalledTimes(1);
	});

	it("empêche le zoom du navigateur et n'atteint pas les enfants", () => {
		const onChildWheel = jest.fn();
		const { getByTestId } = render(
			<Harness onZoomStep={jest.fn()} onChildWheel={onChildWheel} />,
		);

		const event = wheel(getByTestId("child"), { ctrlKey: true, deltaY: -100 });

		expect(event.defaultPrevented).toBe(true);
		expect(onChildWheel).not.toHaveBeenCalled();
	});

	it("laisse la molette seule défiler", () => {
		const onZoomStep = jest.fn();
		const onChildWheel = jest.fn();
		const { getByTestId } = render(
			<Harness onZoomStep={onZoomStep} onChildWheel={onChildWheel} />,
		);

		const event = wheel(getByTestId("child"), { deltaY: -100 });

		expect(event.defaultPrevented).toBe(false);
		expect(onZoomStep).not.toHaveBeenCalled();
		expect(onChildWheel).toHaveBeenCalled();
	});

	it("cumule les petits déplacements d'un pincement avant de zoomer d'un pas", () => {
		const onZoomStep = jest.fn();
		const { getByTestId } = render(<Harness onZoomStep={onZoomStep} />);

		for (let i = 0; i < 9; i++)
			wheel(getByTestId("area"), { ctrlKey: true, deltaY: -10 });
		expect(onZoomStep).not.toHaveBeenCalled();

		wheel(getByTestId("area"), { ctrlKey: true, deltaY: -10 });
		expect(onZoomStep).toHaveBeenCalledTimes(1);
		expect(onZoomStep).toHaveBeenCalledWith(1);
	});

	it("fait plusieurs pas pour un grand déplacement", () => {
		const onZoomStep = jest.fn();
		const { getByTestId } = render(<Harness onZoomStep={onZoomStep} />);

		wheel(getByTestId("area"), { ctrlKey: true, deltaY: 250 });

		expect(onZoomStep).toHaveBeenCalledTimes(2);
		expect(onZoomStep).toHaveBeenCalledWith(-1);
	});

	it("compte les lignes (deltaMode 1) comme des pixels", () => {
		const onZoomStep = jest.fn();
		const { getByTestId } = render(<Harness onZoomStep={onZoomStep} />);

		wheel(getByTestId("area"), { ctrlKey: true, deltaY: -7, deltaMode: 1 });

		expect(onZoomStep).toHaveBeenCalledTimes(1);
	});

	it("utilise le dernier rappel fourni", () => {
		const first = jest.fn();
		const second = jest.fn();
		const { getByTestId, rerender } = render(<Harness onZoomStep={first} />);

		rerender(<Harness onZoomStep={second} />);
		wheel(getByTestId("area"), { ctrlKey: true, deltaY: -100 });

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith(1);
	});

	it("cesse d'écouter au démontage", () => {
		const onZoomStep = jest.fn();
		const { getByTestId, unmount } = render(
			<Harness onZoomStep={onZoomStep} />,
		);
		const area = getByTestId("area");

		unmount();
		wheel(area, { ctrlKey: true, deltaY: -100 });

		expect(onZoomStep).not.toHaveBeenCalled();
	});
});
