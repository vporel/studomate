/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import ConflictDialog from "./ConflictDialog";

function setup() {
	const onFirst = jest.fn();
	const onSecond = jest.fn();
	render(
		<ConflictDialog
			title="Conflit"
			paragraphs={["Premier paragraphe", "Second paragraphe"]}
			actions={[
				{ label: "Recharger", variant: "outlined", onClick: onFirst },
				{ label: "Copier", variant: "contained", onClick: onSecond },
			]}
		/>,
	);
	return { onFirst, onSecond };
}

describe("ConflictDialog", () => {
	it("affiche le titre et les deux paragraphes", () => {
		setup();

		expect(screen.getByText("Conflit")).toBeInTheDocument();
		expect(screen.getByText("Premier paragraphe")).toBeInTheDocument();
		expect(screen.getByText("Second paragraphe")).toBeInTheDocument();
	});

	it("affiche les actions dans l'ordre fourni", () => {
		setup();

		expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
			"Recharger",
			"Copier",
		]);
	});

	it("applique la variante de chaque bouton", () => {
		setup();

		expect(screen.getByText("Recharger")).toHaveClass("MuiButton-outlined");
		expect(screen.getByText("Copier")).toHaveClass("MuiButton-contained");
	});

	it("appelle uniquement le callback du bouton cliqué", () => {
		const { onFirst, onSecond } = setup();

		fireEvent.click(screen.getByText("Copier"));

		expect(onSecond).toHaveBeenCalledTimes(1);
		expect(onFirst).not.toHaveBeenCalled();
	});
});
