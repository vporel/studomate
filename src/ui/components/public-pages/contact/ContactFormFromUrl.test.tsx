/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ContactFormFromUrl from "./ContactFormFromUrl";

let mockQuery = "";
jest.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(mockQuery),
}));

const topicField = () => screen.getByRole("combobox", { name: "Sujet" });

describe("ContactFormFromUrl", () => {
	it("preselects the topic of the query string", () => {
		mockQuery = "topic=forgotten-password";
		renderWithI18n(<ContactFormFromUrl />);

		expect(topicField()).toHaveTextContent(
			"Mot de passe oublié, accès au compte",
		);
	});

	it("ignores an unknown topic", () => {
		mockQuery = "topic=anything";
		renderWithI18n(<ContactFormFromUrl />);

		expect(topicField()).toHaveTextContent("Question sur l'utilisation");
	});
});
