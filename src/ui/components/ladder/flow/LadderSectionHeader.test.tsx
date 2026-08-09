/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import SectionRemoveCommand from "@/schemas/ladder/commands/section-remove.command";
import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import Section from "@/schemas/ladder/section.schema";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderSectionHeader from "./LadderSectionHeader";

jest.mock("../context/LadderContext");

function setup({
	title = "Ma section",
	index = 0,
	collapsed = false,
	sectionsCount = 2,
	onToggleCollapse = jest.fn(),
	executeOperation = jest.fn(),
} = {}) {
	const section = new Section("s1", title, "", [], []);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			commandsStackManager: { executeOperation },
			ladder: { sections: new Array(sectionsCount).fill(null) },
		}),
	);

	render(
		<LadderSectionHeader
			section={section}
			index={index}
			collapsed={collapsed}
			onToggleCollapse={onToggleCollapse}
			dragHandleAttributes={{} as any}
			dragHandleListeners={{} as any}
		/>,
	);

	return { section, executeOperation, onToggleCollapse };
}

describe("LadderSectionHeader — édition du titre", () => {
	it("dispatche SectionUpdateCommand quand le titre change et perd le focus", () => {
		const { section, executeOperation } = setup({ title: "Avant" });
		const input = screen.getByLabelText("Titre de la section");

		fireEvent.change(input, { target: { value: "Après" } });
		fireEvent.blur(input);

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(SectionUpdateCommand);
		expect(commands[0].payload).toEqual({
			sectionId: section.id,
			title: "Après",
			previousTitle: "Avant",
		});
	});

	it("ne dispatche rien si le titre n'a pas changé (blur sans modification)", () => {
		const { executeOperation } = setup({ title: "Inchangé" });
		const input = screen.getByLabelText("Titre de la section");

		fireEvent.blur(input);

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("commit le titre sur Entrée (perd le focus)", () => {
		const { executeOperation } = setup({ title: "Avant" });
		const input = screen.getByLabelText("Titre de la section") as HTMLInputElement;
		act(() => input.focus());

		fireEvent.change(input, { target: { value: "Après" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(executeOperation).toHaveBeenCalledTimes(1);
	});

	it("annule la saisie sur Échap (revient au titre d'origine, aucune commande dispatchée)", () => {
		const { executeOperation } = setup({ title: "Original" });
		const input = screen.getByLabelText("Titre de la section") as HTMLInputElement;
		act(() => input.focus());

		fireEvent.change(input, { target: { value: "Modifié" } });
		fireEvent.keyDown(input, { key: "Escape" });

		expect(input.value).toBe("Original");
		expect(executeOperation).not.toHaveBeenCalled();
	});
});

describe("LadderSectionHeader — suppression et réordonnancement", () => {
	it("dispatche SectionRemoveCommand au clic sur Supprimer, avec l'index de la section", () => {
		const { section, executeOperation } = setup({ index: 2, sectionsCount: 3 });

		fireEvent.click(screen.getByLabelText("Supprimer la section"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(SectionRemoveCommand);
		expect(commands[0].payload).toMatchObject({ sectionId: section.id, index: 2 });
	});

	it("désactive Supprimer et la poignée de réordonnancement quand c'est la seule section du ladder", () => {
		setup({ sectionsCount: 1 });

		expect(screen.getByLabelText("Supprimer la section")).toBeDisabled();
		expect(screen.getByLabelText("Réordonner la section")).toHaveAttribute("aria-disabled", "true");
	});

	it("active Supprimer et la poignée de réordonnancement dès qu'il y a plusieurs sections", () => {
		setup({ sectionsCount: 2 });

		expect(screen.getByLabelText("Supprimer la section")).not.toBeDisabled();
		expect(screen.getByLabelText("Réordonner la section")).toHaveAttribute("aria-disabled", "false");
	});
});
