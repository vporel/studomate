/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, within } from "@testing-library/react";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import InputBehaviorCell from "./InputBehaviorCell";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(variable: Variable, editable = true) {
	const updateVariable = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { variables: [variable] },
			variablesManager: { updateVariable },
		}),
	);
	renderWithI18n(<InputBehaviorCell variableId={variable.id} editable={editable} />);
	return { updateVariable };
}

function chooseKind(label: string) {
	fireEvent.mouseDown(screen.getByRole("combobox"));
	fireEvent.click(within(screen.getByRole("listbox")).getByText(label));
}

describe("InputBehaviorCell", () => {
	it("affiche le résumé du comportement d'un curseur", () => {
		setup(
			new Variable("v1", "niveau", "analog-input", "INT").update({
				behavior: { kind: "slider", params: { min: 0, max: 100 } },
			}),
			false,
		);

		expect(screen.getByText("Curseur (0 … 100)")).toBeInTheDocument();
	});

	it("n'affiche rien pour une variable sans comportement possible", () => {
		setup(new Variable("v1", "m", "memory", "BOOL"));

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByText("Aucun")).not.toBeInTheDocument();
	});

	it("propose les comportements d'une entrée TOR et applique le choix", () => {
		const { updateVariable } = setup(new Variable("v1", "arret", "logic-input", "BOOL"));

		fireEvent.click(screen.getByRole("button", { name: "Modifier le comportement de arret" }));
		fireEvent.mouseDown(screen.getByRole("combobox"));
		const options = within(screen.getByRole("listbox"))
			.getAllByRole("option")
			.map((o) => o.textContent);
		expect(options).toEqual([
			"Aucun",
			"Bouton poussoir NO",
			"Bouton poussoir NF",
			"Commutateur NO",
			"Commutateur NF",
		]);
		fireEvent.click(within(screen.getByRole("listbox")).getByText("Bouton poussoir NF"));
		fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));

		expect(updateVariable).toHaveBeenCalledWith("v1", {
			behavior: { kind: "push-button-nc", params: null },
		});
	});

	it("pré-remplit un nouveau curseur de 0 à 100 et refuse des bornes invalides", () => {
		const { updateVariable } = setup(new Variable("v1", "niveau", "analog-input", "WORD"));

		fireEvent.click(screen.getByRole("button", { name: "Modifier le comportement de niveau" }));
		chooseKind("Curseur");
		const [min, max] = screen.getAllByRole("spinbutton");
		expect(min).toHaveValue(0);
		expect(max).toHaveValue(100);

		fireEvent.change(min, { target: { value: "-5" } });
		expect(screen.getByText(/plage du type WORD/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Appliquer" })).toBeDisabled();

		fireEvent.change(min, { target: { value: "10" } });
		fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));

		expect(updateVariable).toHaveBeenCalledWith("v1", {
			behavior: { kind: "slider", params: { min: 10, max: 100 } },
		});
	});

	it("« Aucun » remet le comportement à null", () => {
		const { updateVariable } = setup(
			new Variable("v1", "marche", "logic-input", "BOOL").update({
				behavior: { kind: "push-button-no", params: null },
			}),
		);

		fireEvent.click(screen.getByRole("button", { name: "Modifier le comportement de marche" }));
		chooseKind("Aucun");
		fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));

		expect(updateVariable).toHaveBeenCalledWith("v1", { behavior: null });
	});

	it("n'ouvre pas le popover hors conception", () => {
		setup(
			new Variable("v1", "marche", "logic-input", "BOOL").update({
				behavior: { kind: "push-button-no", params: null },
			}),
			false,
		);

		expect(screen.getByText("Bouton poussoir NO")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
