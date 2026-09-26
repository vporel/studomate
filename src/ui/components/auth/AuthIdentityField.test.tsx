/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import AuthIdentityField from "./AuthIdentityField";
import { AuthMode } from "./AuthModeSelector";

function setup(mode: AuthMode, pseudoHelperText?: string) {
	const onPseudoChange = jest.fn();
	const onEmailChange = jest.fn();
	renderWithI18n(
		<AuthIdentityField
			mode={mode}
			pseudo="alice"
			email="a@b.fr"
			onPseudoChange={onPseudoChange}
			onEmailChange={onEmailChange}
			pseudoHelperText={pseudoHelperText}
		/>,
	);
	return { onPseudoChange, onEmailChange, input: screen.getByRole("textbox") };
}

describe("AuthIdentityField", () => {
	it("mode anonyme : champ pseudo requis, rempli avec le pseudo", () => {
		const { input } = setup("anonymous");

		expect(input).toHaveValue("alice");
		expect(input).toBeRequired();
		expect(input).not.toHaveAttribute("type", "email");
	});

	it("mode anonyme : remonte la saisie du pseudo seulement", () => {
		const { input, onPseudoChange, onEmailChange } = setup("anonymous");

		fireEvent.change(input, { target: { value: "bob" } });

		expect(onPseudoChange).toHaveBeenCalledWith("bob");
		expect(onEmailChange).not.toHaveBeenCalled();
	});

	it("mode réel : champ email requis, rempli avec l'email", () => {
		const { input } = setup("real");

		expect(input).toHaveValue("a@b.fr");
		expect(input).toHaveAttribute("type", "email");
		expect(input).toBeRequired();
	});

	it("mode réel : remonte la saisie de l'email seulement", () => {
		const { input, onPseudoChange, onEmailChange } = setup("real");

		fireEvent.change(input, { target: { value: "c@d.fr" } });

		expect(onEmailChange).toHaveBeenCalledWith("c@d.fr");
		expect(onPseudoChange).not.toHaveBeenCalled();
	});

	it("affiche l'aide du pseudo quand elle est fournie", () => {
		setup("anonymous", "Lettres et chiffres");

		expect(screen.getByText("Lettres et chiffres")).toBeInTheDocument();
	});

	it("n'affiche pas l'aide du pseudo en mode réel", () => {
		setup("real", "Lettres et chiffres");

		expect(screen.queryByText("Lettres et chiffres")).not.toBeInTheDocument();
	});
});
