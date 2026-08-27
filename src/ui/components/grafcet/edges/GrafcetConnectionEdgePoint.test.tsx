/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import GrafcetConnectionEdgePoint from "./GrafcetConnectionEdgePoint";

function renderPoint(
	props: Partial<React.ComponentProps<typeof GrafcetConnectionEdgePoint>>,
) {
	return render(
		<svg>
			<GrafcetConnectionEdgePoint
				index={1}
				x={10}
				y={20}
				color="black"
				mode="move"
				{...props}
			/>
		</svg>,
	);
}

describe("GrafcetConnectionEdgePoint", () => {
	it("place les deux cercles aux coordonnées fournies", () => {
		const { container } = renderPoint({ x: 42, y: 7 });
		const circles = container.querySelectorAll("circle");
		expect(circles).toHaveLength(2);
		circles.forEach((c) => {
			expect(c.getAttribute("cx")).toBe("42");
			expect(c.getAttribute("cy")).toBe("7");
		});
	});

	it("mode 'move' : le cercle visible est plein de la couleur, et les handlers pointer reçoivent l'index", () => {
		const onPointerDown = jest.fn();
		const onPointerUp = jest.fn();
		const { container } = renderPoint({
			mode: "move",
			color: "red",
			onPointerDown,
			onPointerUp,
		});
		const [visible, hit] = container.querySelectorAll("circle");

		expect(visible.getAttribute("fill")).toBe("red");

		fireEvent.pointerDown(hit);
		fireEvent.pointerUp(hit);
		expect(onPointerDown).toHaveBeenCalledWith(expect.anything(), 1);
		expect(onPointerUp).toHaveBeenCalledWith(expect.anything(), 1);
	});

	it("mode 'add' : le cercle visible est blanc et le clic déclenche onAdd avec l'index", () => {
		const onAdd = jest.fn();
		const { container } = renderPoint({
			mode: "add",
			onAdd,
			onPointerDown: undefined,
		});
		const [visible, hit] = container.querySelectorAll("circle");

		expect(visible.getAttribute("fill")).toBe("#fff");

		fireEvent.click(hit);
		expect(onAdd).toHaveBeenCalledWith(1);
	});
});
