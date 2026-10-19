/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ExampleCard from "./ExampleCard";
import { listStartupExamples } from "./startup-examples";

const [example] = listStartupExamples();

describe("ExampleCard", () => {
	it("propose l'exercice avant la solution", () => {
		renderWithI18n(<ExampleCard example={example} onOpen={jest.fn()} />);
		expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
			"Faire l'exercice",
			"Voir la solution",
		]);
	});

	it("ouvre l'exercice ou la solution selon le bouton", () => {
		const onOpen = jest.fn();
		renderWithI18n(<ExampleCard example={example} onOpen={onOpen} />);
		fireEvent.click(screen.getByRole("button", { name: "Faire l'exercice" }));
		expect(onOpen).toHaveBeenLastCalledWith("exercise");
		fireEvent.click(screen.getByRole("button", { name: "Voir la solution" }));
		expect(onOpen).toHaveBeenLastCalledWith("solution");
	});
});
