/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { useLadderContext } from "../context/LadderContext";
import useLadderSectionSelection from "./useLadderSectionSelection";

jest.mock("../context/LadderContext");

function setup(sectionIds = ["s1", "s2", "s3"]) {
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
		useLadderSectionSelection();
		return (
			<div>
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
	return { ...utils, setSelectedSectionIds, deselectAllElements, deleteSections };
}

describe("useLadderSectionSelection", () => {
	it("clic simple sur un en-tête → sélectionne cette seule section + vide les éléments", () => {
		const { getByTestId, setSelectedSectionIds, deselectAllElements } = setup();

		fireEvent.pointerDown(getByTestId("btn-s2"));

		expect(setSelectedSectionIds).toHaveBeenLastCalledWith(["s2"]);
		expect(deselectAllElements).toHaveBeenCalledTimes(1);
	});

	const pointerDown = (el: Element, init: MouseEventInit = {}) =>
		el.dispatchEvent(
			new MouseEvent("pointerdown", { bubbles: true, ...init }),
		);

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
