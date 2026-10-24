/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import useCanEdit from "@/ui/components/projects/useCanEdit";
import { useLadderContext } from "../context/LadderContext";
import useLadderSectionSelection from "./useLadderSectionSelection";

jest.mock("../context/LadderContext");
jest.mock("@/ui/components/projects/useCanEdit");

function setup(sectionIds = ["s1", "s2", "s3"], canEdit = true) {
	(useCanEdit as jest.Mock).mockReturnValue(canEdit);
	const setSelectedSectionIds = jest.fn();
	const deselectAllElements = jest.fn();
	const deleteSections = jest.fn();
	let selectedSectionIds: string[] = [];

	const state = {
		get selectedSectionIds() {
			return selectedSectionIds;
		},
		setSelectedSectionIds: (ids: string[]) => {
			selectedSectionIds = ids;
			setSelectedSectionIds(ids);
		},
		ladder: { sections: sectionIds.map((id) => ({ id })) },
		workflowManager: { deselectAllElements, deleteSections },
	};

	(useLadderContext as jest.Mock).mockReturnValue({
		store: { getState: () => state },
	});

	function Host() {
		const container = useRef<HTMLDivElement>(null);
		useLadderSectionSelection(container);
		return (
			<div ref={container}>
				{sectionIds.map((id) => (
					<div key={id} data-section-header={id} data-testid={`h-${id}`}>
						<button data-testid={`btn-${id}`}>x</button>
					</div>
				))}
				<div data-testid="outside">ailleurs</div>
			</div>
		);
	}

	const utils = render(<Host />);
	return {
		...utils,
		setSelectedSectionIds,
		deselectAllElements,
		deleteSections,
	};
}

describe("useLadderSectionSelection", () => {
	it("clic simple sur un en-tête → sélectionne cette seule section + vide les éléments", () => {
		const { getByTestId, setSelectedSectionIds, deselectAllElements } = setup();

		fireEvent.pointerDown(getByTestId("btn-s2"));

		expect(setSelectedSectionIds).toHaveBeenLastCalledWith(["s2"]);
		expect(deselectAllElements).toHaveBeenCalledTimes(1);
	});

	const pointerDown = (el: Element, init: MouseEventInit = {}) =>
		el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, ...init }));

	it("Ctrl+clic ajoute puis retire une section de la sélection", () => {
		const { getByTestId, setSelectedSectionIds } = setup();

		pointerDown(getByTestId("h-s1"));
		pointerDown(getByTestId("h-s3"), { ctrlKey: true });
		expect(setSelectedSectionIds).toHaveBeenLastCalledWith(["s1", "s3"]);

		pointerDown(getByTestId("h-s3"), { ctrlKey: true });
		expect(setSelectedSectionIds).toHaveBeenLastCalledWith(["s1"]);
	});

	it("Shift+clic étend de l'ancre jusqu'à la section, dans l'ordre du ladder", () => {
		const { getByTestId, setSelectedSectionIds } = setup();

		pointerDown(getByTestId("h-s3"));
		pointerDown(getByTestId("h-s1"), { shiftKey: true });

		expect(setSelectedSectionIds).toHaveBeenLastCalledWith(["s1", "s2", "s3"]);
	});

	it("clic hors de tout en-tête → vide la sélection, sans toucher aux éléments", () => {
		const { getByTestId, setSelectedSectionIds, deselectAllElements } = setup();
		fireEvent.pointerDown(getByTestId("h-s1"));
		deselectAllElements.mockClear();

		fireEvent.pointerDown(getByTestId("outside"));

		expect(setSelectedSectionIds).toHaveBeenLastCalledWith([]);
		expect(deselectAllElements).not.toHaveBeenCalled();
	});

	it("Suppr avec des sections sélectionnées → deleteSections(selection)", () => {
		const { getByTestId, deleteSections } = setup();
		pointerDown(getByTestId("h-s1"));
		pointerDown(getByTestId("h-s3"), { ctrlKey: true });

		fireEvent.keyDown(document.body, { key: "Delete" });

		expect(deleteSections).toHaveBeenCalledWith(["s1", "s3"]);
	});

	it("Backspace fonctionne aussi", () => {
		const { getByTestId, deleteSections } = setup();
		pointerDown(getByTestId("h-s2"));

		fireEvent.keyDown(document.body, { key: "Backspace" });

		expect(deleteSections).toHaveBeenCalledWith(["s2"]);
	});

	it("Suppr sans section sélectionnée → ne fait rien", () => {
		const { deleteSections } = setup();

		fireEvent.keyDown(document.body, { key: "Delete" });

		expect(deleteSections).not.toHaveBeenCalled();
	});

	it("Suppr sur un projet en lecture seule → ne supprime rien", () => {
		const { getByTestId, deleteSections } = setup(["s1", "s2", "s3"], false);
		pointerDown(getByTestId("h-s1"));

		fireEvent.keyDown(document.body, { key: "Delete" });

		expect(deleteSections).not.toHaveBeenCalled();
	});

	it("un en-tête situé hors de son conteneur ne sélectionne rien", () => {
		const { getByTestId, setSelectedSectionIds } = setup();
		pointerDown(getByTestId("h-s1"));
		const foreign = document.createElement("div");
		foreign.setAttribute("data-section-header", "s2");
		document.body.appendChild(foreign);

		foreign.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

		expect(setSelectedSectionIds).toHaveBeenLastCalledWith([]);
		foreign.remove();
	});

	it("Suppr venu d'un autre bloc embarqué → ignoré", () => {
		const { getByTestId, deleteSections } = setup();
		pointerDown(getByTestId("h-s1"));
		const otherBlock = document.createElement("div");
		otherBlock.setAttribute("data-embedded-block", "");
		const inside = document.createElement("span");
		otherBlock.appendChild(inside);
		document.body.appendChild(otherBlock);

		fireEvent.keyDown(inside, { key: "Delete" });

		expect(deleteSections).not.toHaveBeenCalled();
		otherBlock.remove();
	});

	it("Suppr en cours de saisie dans un input → ignoré", () => {
		const { getByTestId, deleteSections } = setup();
		pointerDown(getByTestId("h-s1"));
		const input = document.createElement("input");
		document.body.appendChild(input);

		fireEvent.keyDown(input, { key: "Delete" });

		expect(deleteSections).not.toHaveBeenCalled();
		input.remove();
	});
});
