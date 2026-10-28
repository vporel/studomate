/** @jest-environment jsdom */

import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n as render } from "@tests/utils/i18n";
import CustomModal from "./CustomModal";

describe("CustomModal", () => {
	it("expose un dialogue nommé par son titre", () => {
		render(
			<CustomModal open onClose={() => {}} title="Nouveau projet">
				<p>contenu</p>
			</CustomModal>,
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog).toHaveAccessibleName("Nouveau projet");
	});

	it("sans titre, le dialogue n'a pas de aria-labelledby", () => {
		render(
			<CustomModal open onClose={() => {}} closeButton={false}>
				<p>contenu</p>
			</CustomModal>,
		);

		expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-labelledby");
	});

	it("ferme via le bouton de fermeture, libellé traduit", () => {
		const onClose = jest.fn();
		render(
			<CustomModal open onClose={onClose} title="Titre">
				<p>contenu</p>
			</CustomModal>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("traduit le bouton de fermeture selon la langue", () => {
		render(
			<CustomModal open onClose={() => {}} title="Title">
				<p>content</p>
			</CustomModal>,
			{ locale: "en" },
		);

		expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
	});

	it("ferme par Échap", () => {
		const onClose = jest.fn();
		render(
			<CustomModal open onClose={onClose} title="Titre">
				<p>contenu</p>
			</CustomModal>,
		);

		fireEvent.keyDown(screen.getByText("contenu"), { key: "Escape" });

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("n'affiche rien quand il est fermé", () => {
		render(
			<CustomModal open={false} onClose={() => {}} title="Titre">
				<p>contenu</p>
			</CustomModal>,
		);

		expect(screen.queryByText("contenu")).not.toBeInTheDocument();
	});

	describe("compact", () => {
		it("supprime le padding et applique width, height et sx", () => {
			render(
				<CustomModal
					open
					compact
					onClose={() => {}}
					title="Titre"
					width="500px"
					height="300px"
					sx={{ maxHeight: "400px" }}
				>
					<p>contenu</p>
				</CustomModal>,
			);

			expect(screen.getByRole("dialog")).toHaveStyle({
				padding: "0px",
				width: "500px",
				height: "300px",
				maxHeight: "400px",
			});
		});

		it("garde le padding hors compact", () => {
			render(
				<CustomModal open onClose={() => {}} title="Titre">
					<p>contenu</p>
				</CustomModal>,
			);

			const dialog = screen.getByRole("dialog");
			expect(dialog).not.toHaveStyle({ padding: "0px" });
		});

		it("titre en h6 et en-tête bordé", () => {
			render(
				<CustomModal open compact onClose={() => {}} title="Titre">
					<p>contenu</p>
				</CustomModal>,
			);

			const title = screen.getByText("Titre");
			expect(title.tagName).toBe("H6");
			expect(title.parentElement).toHaveStyle({
				borderBottom: "1px solid #e0e0e0",
			});
		});

		it("hors compact, le titre reste en h3 sans bordure", () => {
			render(
				<CustomModal open onClose={() => {}} title="Titre">
					<p>contenu</p>
				</CustomModal>,
			);

			const title = screen.getByText("Titre");
			expect(title.tagName).toBe("H3");
			expect(title.parentElement).not.toHaveStyle({
				borderBottom: "1px solid #e0e0e0",
			});
		});
	});

	describe("flexColumn", () => {
		it("dispose le contenu en colonne flex", () => {
			render(
				<CustomModal open flexColumn onClose={() => {}} title="Titre">
					<p>contenu</p>
				</CustomModal>,
			);

			expect(screen.getByRole("dialog")).toHaveStyle({
				display: "flex",
				flexDirection: "column",
			});
		});

		it("est indépendant de compact : le padding reste", () => {
			render(
				<CustomModal open flexColumn onClose={() => {}} title="Titre">
					<p>contenu</p>
				</CustomModal>,
			);

			expect(screen.getByRole("dialog")).not.toHaveStyle({ padding: "0px" });
		});

		it("sans la prop, la modale n'est pas en flex", () => {
			render(
				<CustomModal open compact onClose={() => {}} title="Titre">
					<p>contenu</p>
				</CustomModal>,
			);

			expect(screen.getByRole("dialog")).not.toHaveStyle({ display: "flex" });
		});
	});
});
