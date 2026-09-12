/**
 * @jest-environment jsdom
 */
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
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
	zoom = 1,
	onToggleCollapse = jest.fn(),
	executeOperation = jest.fn(),
	zoomIn = jest.fn(),
	zoomOut = jest.fn(),
	duplicateSection = jest.fn(),
	copySections = jest.fn(),
	deleteSections = jest.fn(),
	selectedSectionIds = [] as string[],
} = {}) {
	const section = new Section("s1", title, "", [], []);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			commandsStackManager: { executeOperation },
			ladder: { sections: new Array(sectionsCount).fill(null) },
			viewManager: { zoomIn, zoomOut },
			workflowManager: { deleteSections },
			copyCutPasteManager: { duplicateSection, copySections },
			zoomBySectionId: { [section.id]: zoom },
			selectedSectionIds,
		}),
	);

	renderWithI18n(
		<LadderSectionHeader
			section={section}
			index={index}
			collapsed={collapsed}
			onToggleCollapse={onToggleCollapse}
			dragHandleAttributes={{} as any}
			dragHandleListeners={{} as any}
		/>,
	);

	return {
		section,
		executeOperation,
		onToggleCollapse,
		zoomIn,
		zoomOut,
		duplicateSection,
		copySections,
		deleteSections,
	};
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
		const input = screen.getByLabelText(
			"Titre de la section",
		) as HTMLInputElement;
		act(() => input.focus());

		fireEvent.change(input, { target: { value: "Après" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(executeOperation).toHaveBeenCalledTimes(1);
	});

	it("annule la saisie sur Échap (revient au titre d'origine, aucune commande dispatchée)", () => {
		const { executeOperation } = setup({ title: "Original" });
		const input = screen.getByLabelText(
			"Titre de la section",
		) as HTMLInputElement;
		act(() => input.focus());

		fireEvent.change(input, { target: { value: "Modifié" } });
		fireEvent.keyDown(input, { key: "Escape" });

		expect(input.value).toBe("Original");
		expect(executeOperation).not.toHaveBeenCalled();
	});
});

describe("LadderSectionHeader — suppression et réordonnancement", () => {
	it("appelle deleteSections avec sa propre section au clic sur Supprimer", () => {
		const { section, deleteSections } = setup({ index: 2, sectionsCount: 3 });

		fireEvent.click(screen.getByLabelText("Supprimer la section"));

		expect(deleteSections).toHaveBeenCalledWith([section.id]);
	});

	it("désactive Supprimer et la poignée de réordonnancement quand c'est la seule section du ladder", () => {
		setup({ sectionsCount: 1 });

		expect(screen.getByLabelText("Supprimer la section")).toBeDisabled();
		expect(screen.getByLabelText("Réordonner la section")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
	});

	it("active Supprimer et la poignée de réordonnancement dès qu'il y a plusieurs sections", () => {
		setup({ sectionsCount: 2 });

		expect(screen.getByLabelText("Supprimer la section")).not.toBeDisabled();
		expect(screen.getByLabelText("Réordonner la section")).toHaveAttribute(
			"aria-disabled",
			"false",
		);
	});
});

describe("LadderSectionHeader — duplication", () => {
	it("appelle duplicateSection au clic sur Dupliquer", () => {
		const { section, duplicateSection } = setup();

		fireEvent.click(screen.getByLabelText("Dupliquer la section"));

		expect(duplicateSection).toHaveBeenCalledWith(section.id);
	});

	it("reste disponible quand la section est repliée", () => {
		const { section, duplicateSection } = setup({ collapsed: true });

		fireEvent.click(screen.getByLabelText("Dupliquer la section"));

		expect(duplicateSection).toHaveBeenCalledWith(section.id);
	});
});

describe("LadderSectionHeader — sélection de section et copie", () => {
	it("expose data-section-header avec l'id de la section", () => {
		const { section } = setup();

		expect(
			document.querySelector(`[data-section-header="${section.id}"]`),
		).not.toBeNull();
	});

	it("appelle copySections avec sa propre section au clic sur Copier", () => {
		const { section, copySections } = setup();

		fireEvent.click(screen.getByLabelText("Copier la section"));

		expect(copySections).toHaveBeenCalledWith([section.id]);
	});

	it("désactive Copier quand plusieurs sections sont sélectionnées", () => {
		setup({ selectedSectionIds: ["s1", "s2"] });

		expect(screen.getByLabelText("Copier la section")).toBeDisabled();
	});

	it("garde Copier actif quand la section est seule sélectionnée", () => {
		setup({ selectedSectionIds: ["s1"] });

		expect(screen.getByLabelText("Copier la section")).not.toBeDisabled();
	});

	it("le pointer-down sur Copier ne se propage pas (pas de sélection de section)", () => {
		setup();
		const docHandler = jest.fn();
		document.addEventListener("pointerdown", docHandler);

		fireEvent.pointerDown(screen.getByLabelText("Copier la section"));

		expect(docHandler).not.toHaveBeenCalled();
		document.removeEventListener("pointerdown", docHandler);
	});

	it("le pointer-down sur un en-tête vierge se propage jusqu'au document", () => {
		const { section } = setup();
		const docHandler = jest.fn();
		document.addEventListener("pointerdown", docHandler);

		fireEvent.pointerDown(
			document.querySelector(`[data-section-header="${section.id}"]`)!,
		);

		expect(docHandler).toHaveBeenCalledTimes(1);
		document.removeEventListener("pointerdown", docHandler);
	});
});

describe("LadderSectionHeader — zoom de la section", () => {
	it("zoome / dézoome la section via le viewManager", () => {
		const { section, zoomIn, zoomOut } = setup({ zoom: 1.5 });

		fireEvent.click(screen.getByLabelText("Zoomer la section"));
		fireEvent.click(screen.getByLabelText("Dézoomer la section"));

		expect(zoomIn).toHaveBeenCalledWith(section.id);
		expect(zoomOut).toHaveBeenCalledWith(section.id);
	});

	it("désactive Zoomer à la borne max", () => {
		setup({ zoom: 2.5 });
		expect(screen.getByLabelText("Zoomer la section")).toBeDisabled();
		expect(screen.getByLabelText("Dézoomer la section")).not.toBeDisabled();
	});

	it("désactive Dézoomer à la borne min", () => {
		setup({ zoom: 1 });
		expect(screen.getByLabelText("Dézoomer la section")).toBeDisabled();
		expect(screen.getByLabelText("Zoomer la section")).not.toBeDisabled();
	});

	it("masque les boutons de zoom quand la section est repliée", () => {
		setup({ collapsed: true });

		expect(screen.queryByLabelText("Zoomer la section")).toBeNull();
		expect(screen.queryByLabelText("Dézoomer la section")).toBeNull();
	});
});
