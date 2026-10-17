/**
 * @jest-environment jsdom
 */
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import AuthForm from "./AuthForm";

describe("AuthForm", () => {
	it("affiche ses enfants", () => {
		render(
			<AuthForm onSubmit={jest.fn()}>
				<span>champ</span>
			</AuthForm>,
		);

		expect(screen.getByText("champ")).toBeInTheDocument();
	});

	it("appelle onSubmit à la soumission et empêche le rechargement de la page", () => {
		const onSubmit = jest.fn();
		render(
			<AuthForm onSubmit={onSubmit}>
				<span>champ</span>
			</AuthForm>,
		);
		const form = screen.getByText("champ").closest("form")!;
		const event = createEvent.submit(form);

		fireEvent(form, event);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});
});
