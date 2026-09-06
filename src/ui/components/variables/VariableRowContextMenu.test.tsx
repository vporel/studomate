/**
 * @jest-environment jsdom
 */
import { selectorImplementation } from "@tests/utils/store-mocks";
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import { useProjectStore } from "../projects/ProjectContext";
import VariableRowContextMenu, {
	VariableRowMenuTarget,
} from "./VariableRowContextMenu";

jest.mock("../projects/ProjectContext");

const target: VariableRowMenuTarget = { variableId: "v1", mnemonic: "M0" };

function setup(withTarget: VariableRowMenuTarget | null = target) {
	const removeVariables = jest.fn();
	const setCrossReferenceResultVisible = jest.fn();
	const setCrossReferenceFilter = jest.fn();
	const onClose = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			variablesManager: { removeVariables },
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
			parentWidth={1000}
			parentHeight={800}
		/>,
	);
	return {
		removeVariables,
		setCrossReferenceResultVisible,
		setCrossReferenceFilter,
		onClose,
	};
}

describe("VariableRowContextMenu", () => {
	it("ne rend rien sans cible", () => {
		setup(null);
		expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
	});

	it("ouvre le panneau des références croisées préfiltré sur la variable", () => {
		const {
			setCrossReferenceFilter,
			setCrossReferenceResultVisible,
			onClose,
		} = setup();
		fireEvent.click(screen.getByText("Références croisées"));
		expect(setCrossReferenceFilter).toHaveBeenCalledWith("M0");
		expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(true);
		expect(onClose).toHaveBeenCalled();
	});

	it("supprime la variable ciblée", () => {
		const { removeVariables, onClose } = setup();
		fireEvent.click(screen.getByText("Supprimer"));
		expect(removeVariables).toHaveBeenCalledWith(["v1"]);
		expect(onClose).toHaveBeenCalled();
	});
});
