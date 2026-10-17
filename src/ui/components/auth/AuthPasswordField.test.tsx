/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import AuthPasswordField from "./AuthPasswordField";

describe("AuthPasswordField", () => {
	it("est un champ mot de passe requis, rempli avec la valeur", () => {
		const { container } = renderWithI18n(
			<AuthPasswordField value="secret" onChange={jest.fn()} />,
		);
		const input = container.querySelector("input")!;

		expect(input).toHaveAttribute("type", "password");
		expect(input).toBeRequired();
		expect(input).toHaveValue("secret");
	});

	it("remonte la saisie", () => {
		const onChange = jest.fn();
		const { container } = renderWithI18n(
			<AuthPasswordField value="" onChange={onChange} />,
		);

		fireEvent.change(container.querySelector("input")!, {
			target: { value: "nouveau" },
		});

		expect(onChange).toHaveBeenCalledWith("nouveau");
	});

	it("porte le libellé traduit du mot de passe", () => {
		renderWithI18n(<AuthPasswordField value="" onChange={jest.fn()} />);

		expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
	});
});
