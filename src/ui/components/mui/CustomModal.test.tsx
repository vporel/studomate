/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
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
});
