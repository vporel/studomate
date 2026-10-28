/**
 * @jest-environment jsdom
 */
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import { useProjectStore } from "../projects/ProjectContext";
import VariableRowContextMenu, {
	VariableRowMenuTarget,
} from "./VariableRowContextMenu";

jest.mock("../projects/ProjectContext");

const target: VariableRowMenuTarget = { variableId: "v1", mnemonic: "M0" };

function setup(
	withTarget: VariableRowMenuTarget | null = target,
	{ editingEnabled = true, crossReference = true } = {},
) {
	const removeVariables = jest.fn();
	const setCrossReferenceResultVisible = jest.fn();
	const setCrossReferenceFilter = jest.fn();
	const onClose = jest.fn();
	const onInsertBelow = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			variablesManager: { removeVariables },
			mode: ProjectMode.DESIGN,
			editingEnabled,
			capabilities: { crossReference },
			setCrossReferenceResultVisible,
			setCrossReferenceFilter,
		}),
	);
	renderWithI18n(
		<VariableRowContextMenu
			visible
			target={withTarget}
			position={{ x: 0, y: 0 }}
			onClose={onClose}
			onInsertBelow={onInsertBelow}
			parentWidth={1000}
			parentHeight={800}
		/>,
	);
	return {
		removeVariables,
		setCrossReferenceResultVisible,
		setCrossReferenceFilter,
		onClose,
		onInsertBelow,
	};
}

describe("VariableRowContextMenu", () => {
	it("ne propose que les références croisées sur un projet en lecture seule", () => {
		setup(target, { editingEnabled: false });

		expect(screen.getByText("Références croisées")).toBeInTheDocument();
		expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
		expect(screen.queryByText("Insérer une variable")).not.toBeInTheDocument();
	});

	it("ne propose pas les références croisées sans panneau pour les afficher", () => {
		setup(target, { crossReference: false });

		expect(screen.queryByText("Références croisées")).not.toBeInTheDocument();
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("n'ouvre rien quand il n'y a rien à proposer", () => {
		setup(target, { editingEnabled: false, crossReference: false });

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("ne rend rien sans cible", () => {
		setup(null);
		expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
	});

	it("ouvre le panneau des références croisées préfiltré sur la variable", () => {
		const { setCrossReferenceFilter, setCrossReferenceResultVisible, onClose } =
			setup();
		fireEvent.click(screen.getByText("Références croisées"));
		expect(setCrossReferenceFilter).toHaveBeenCalledWith("M0");
		expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(true);
		expect(onClose).toHaveBeenCalled();
	});

	it("propose « Insérer une variable » en première position et la relaie sur la cible", () => {
		const { onInsertBelow } = setup();
		const labels = screen.getAllByRole("menuitem").map((li) => li.textContent);
		expect(labels[0]).toContain("Insérer une variable");
		fireEvent.click(screen.getByText("Insérer une variable"));
		expect(onInsertBelow).toHaveBeenCalledWith("v1");
	});

	it("supprime la variable ciblée", () => {
		const { removeVariables, onClose } = setup();
		fireEvent.click(screen.getByText("Supprimer"));
		expect(removeVariables).toHaveBeenCalledWith(["v1"]);
		expect(onClose).toHaveBeenCalled();
	});
});
