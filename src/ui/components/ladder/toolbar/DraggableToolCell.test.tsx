/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import DraggableToolCell from "./DraggableToolCell";

const setup = (props = {}) => {
	const onDragStart = jest.fn();
	const onDragEnd = jest.fn();
	render(
		<DraggableToolCell
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			{...props}
		>
			<span>icône</span>
		</DraggableToolCell>,
	);
	return {
		cell: screen.getByText("icône").parentElement!,
		onDragStart,
		onDragEnd,
	};
};

describe("DraggableToolCell", () => {
	it("est déplaçable et relaie les événements de glisser", () => {
		const { cell, onDragStart, onDragEnd } = setup();

		expect(cell).toHaveAttribute("draggable", "true");
		fireEvent.dragStart(cell);
		fireEvent.dragEnd(cell);

		expect(onDragStart).toHaveBeenCalledTimes(1);
		expect(onDragEnd).toHaveBeenCalledTimes(1);
	});

	it("désactivé : non déplaçable, atténué, curseur interdit", () => {
		const { cell } = setup({ disabled: true });

		expect(cell).toHaveAttribute("draggable", "false");
		expect(cell).toHaveStyle({ opacity: "0.4", cursor: "not-allowed" });
	});

	it("applique la largeur fournie, 45 par défaut", () => {
		expect(setup().cell).toHaveStyle({ width: "45px" });
	});

	it("applique la largeur fournie", () => {
		expect(setup({ width: 60 }).cell).toHaveStyle({ width: "60px" });
	});

	it("expose le libellé en info-bulle seulement s'il est fourni", () => {
		expect(setup({ label: "Contact" }).cell).toHaveAttribute(
			"aria-label",
			"Contact",
		);
	});

	it("n'ajoute pas d'aria-label sans libellé", () => {
		expect(setup().cell).not.toHaveAttribute("aria-label");
	});
});
