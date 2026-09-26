/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import AuthFormError from "./AuthFormError";

describe("AuthFormError", () => {
	it("affiche le message d'erreur", () => {
		render(<AuthFormError error="Identifiants invalides" />);

		expect(screen.getByText("Identifiants invalides")).toBeInTheDocument();
	});

	it("n'affiche rien sans erreur", () => {
		const { container } = render(<AuthFormError error={null} />);

		expect(container).toBeEmptyDOMElement();
	});
});
