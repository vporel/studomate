/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useProjectStore } from "../projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import Variable from "@/schemas/variable/variable.schema";
import { selectorImplementation } from "@tests/utils/store-mocks";
import VariablesTable from "./VariablesTable";

jest.mock("../projects/ProjectContext");

function setupWithVariables(variables: Variable[], removeVariables = jest.fn()) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			variablesManager: {
				existsByMnemonic: () => undefined,
				existsByAddress: () => undefined,
				removeVariables,
			},
			project: { variables },
			mode: ProjectMode.DESIGN,
		}),
	);
	render(<VariablesTable zones={["logic-input"]} />);
	return { removeVariables };
}

describe("VariablesTable", () => {
	it("lève si aucune zone n'est fournie", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {},
				project: { variables: [] },
				mode: ProjectMode.DESIGN,
			}),
		);
		expect(() => render(<VariablesTable zones={[]} />)).toThrow();
	});

	it("affiche une ligne par variable des zones demandées, plus la ligne vide d'ajout", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: { existsByMnemonic: () => undefined, existsByAddress: () => undefined },
				project: {
					variables: [
						new Variable("v1", "I0", "logic-input", "BOOL"),
						new Variable("v2", "M0", "memory", "BOOL"),
					],
				},
				mode: ProjectMode.DESIGN,
			}),
		);

		render(<VariablesTable zones={["logic-input"]} />);

		expect(screen.getByText("I0")).toBeInTheDocument();
		expect(screen.queryByText("M0")).not.toBeInTheDocument();
	});

	it("désactive le bouton de suppression tant qu'aucune ligne n'est sélectionnée", () => {
		setupWithVariables([new Variable("v1", "I0", "logic-input", "BOOL")]);
		expect(screen.getByRole("button", { name: "" })).toBeDisabled(); // IconButton delete, sans libellé accessible
	});

	it("supprime les variables sélectionnées au clic sur le bouton de suppression", () => {
		const { removeVariables } = setupWithVariables([new Variable("v1", "I0", "logic-input", "BOOL")]);

		const rowCheckbox = screen.getAllByRole("checkbox")[1]; // [0] = case "tout sélectionner"
		fireEvent.click(rowCheckbox);
		const deleteButton = screen.getAllByRole("button").find((b) => b.querySelector('[data-testid="DeleteIcon"]'))!;
		fireEvent.click(deleteButton);

		expect(removeVariables).toHaveBeenCalledWith(["v1"]);
	});

	it("filtre les lignes affichées via la recherche rapide", async () => {
		setupWithVariables([
			new Variable("v1", "I0", "logic-input", "BOOL"),
			new Variable("v2", "I1", "logic-input", "BOOL"),
		]);

		fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
		fireEvent.change(screen.getByPlaceholderText("Rechercher..."), { target: { value: "I0" } });

		await waitFor(() => expect(screen.queryByText("I1")).not.toBeInTheDocument());
		expect(screen.getByText("I0")).toBeInTheDocument();
	});
});
