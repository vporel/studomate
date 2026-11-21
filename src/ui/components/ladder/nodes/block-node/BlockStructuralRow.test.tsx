/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import BlockStructuralRow from "./BlockStructuralRow";

describe("BlockStructuralRow", () => {
	it("affiche le libellé et les noms des ports d'entrée et de sortie", () => {
		render(
			<BlockStructuralRow
				label="Convoyeur"
				inputLabel="EN"
				outputLabel="ENO"
			/>,
		);

		expect(screen.getByText("Convoyeur")).toBeInTheDocument();
		expect(screen.getByText("EN")).toBeInTheDocument();
		expect(screen.getByText("ENO")).toBeInTheDocument();
	});

	it("remplace le libellé texte par labelSlot quand il est fourni", () => {
		render(
			<BlockStructuralRow
				label="Convoyeur"
				labelSlot={<input aria-label="Nom" />}
				inputLabel="IN"
				outputLabel="Q"
			/>,
		);

		expect(screen.getByLabelText("Nom")).toBeInTheDocument();
		expect(screen.queryByText("Convoyeur")).not.toBeInTheDocument();
		expect(screen.getByText("IN")).toBeInTheDocument();
		expect(screen.getByText("Q")).toBeInTheDocument();
	});
});
