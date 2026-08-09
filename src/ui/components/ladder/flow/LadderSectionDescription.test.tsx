/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import Section from "@/schemas/ladder/section.schema";
import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderSectionDescription from "./LadderSectionDescription";

jest.mock("../context/LadderContext");

function setup(description = "", executeOperation = jest.fn()) {
	const section = new Section("s1", "Section", description);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ commandsStackManager: { executeOperation } }),
	);
	render(<LadderSectionDescription section={section} />);
	return { section, executeOperation };
}

function textarea(): HTMLTextAreaElement {
	return screen.getByLabelText("Description de la section") as HTMLTextAreaElement;
}

describe("LadderSectionDescription", () => {
	it("dispatche SectionUpdateCommand quand la description change et perd le focus", () => {
		const { section, executeOperation } = setup("Avant");

		fireEvent.change(textarea(), { target: { value: "Après" } });
		fireEvent.blur(textarea());

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(SectionUpdateCommand);
		expect(commands[0].payload).toEqual({
			sectionId: section.id,
			description: "Après",
			previousDescription: "Avant",
		});
	});

	it("ne dispatche rien si la description n'a pas changé", () => {
		const { executeOperation } = setup("Inchangée");

		fireEvent.blur(textarea());

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("annule la saisie sur Échap (revient à la description d'origine)", () => {
		setup("Originale");
		const input = textarea();
		act(() => input.focus());

		fireEvent.change(input, { target: { value: "Modifiée" } });
		fireEvent.keyDown(input, { key: "Escape" });

		expect(input.value).toBe("Originale");
	});
});
