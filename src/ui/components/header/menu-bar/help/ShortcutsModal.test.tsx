/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ShortcutsModal from "./ShortcutsModal";

describe("ShortcutsModal", () => {
	it("n'est pas visible quand open est false", () => {
		renderWithI18n(<ShortcutsModal open={false} onClose={jest.fn()} />);
		expect(screen.queryByText("Raccourcis clavier")).not.toBeInTheDocument();
	});

	it("s'affiche quand open est true", () => {
		renderWithI18n(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument();
	});

	it("affiche le titre 'Raccourcis clavier'", () => {
		renderWithI18n(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument();
	});

	it("liste les trois groupes de raccourcis", () => {
		renderWithI18n(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Fichier")).toBeInTheDocument();
		expect(screen.getByText("Projet")).toBeInTheDocument();
		expect(screen.getByText("Édition")).toBeInTheDocument();
	});

	it("affiche les raccourcis clés attendus", () => {
		renderWithI18n(<ShortcutsModal open onClose={jest.fn()} />);
		expect(screen.getByText("Enregistrer")).toBeInTheDocument();
		expect(screen.getByText("Annuler")).toBeInTheDocument();
		expect(screen.getByText("Nouveau grafcet")).toBeInTheDocument();
	});

	it("appelle onClose au clic sur la croix de fermeture", () => {
		const onClose = jest.fn();
		renderWithI18n(<ShortcutsModal open onClose={onClose} />);
		fireEvent.click(screen.getByRole("button", { name: /fermer/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
