/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import ShortcutsModal from "./ShortcutsModal";

describe("ShortcutsModal", () => {
	it("n'est pas visible quand open est false", () => {
		render(<ShortcutsModal open={false} onClose={jest.fn()} />);
		expect(screen.queryByText("Raccourcis clavier")).not.toBeInTheDocument();
	});

	it("s'affiche quand open est true", () => {
		render(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument();
	});

	it("affiche le titre 'Raccourcis clavier'", () => {
		render(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument();
	});

	it("liste les trois groupes de raccourcis", () => {
		render(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Fichier")).toBeInTheDocument();
		expect(screen.getByText("Projet")).toBeInTheDocument();
		expect(screen.getByText("Édition")).toBeInTheDocument();
	});

	it("affiche les raccourcis clés attendus", () => {
		render(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Enregistrer")).toBeInTheDocument();
		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Nouveau grafcet")).toBeInTheDocument();
	});

	it("appelle onClose au clic sur la croix de fermeture", () => {
		const onClose = jest.fn();
		render(<ShortcutsModal open onClose={onClose} />);
		fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
