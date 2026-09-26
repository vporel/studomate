/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import VariableValueCell from "./VariableValueCell";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(variable: Variable, value: unknown, dialect = Dialect.FR) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { dialect, variables: [variable] },
			simulationVariablesStates: value === undefined ? {} : { [variable.id]: { value } },
		}),
	);
	return render(<VariableValueCell variableId={variable.id} />);
}

describe("VariableValueCell", () => {
	it("affiche une valeur booléenne dans le dialecte du projet", () => {
		setup(new Variable("v1", "moteur", "logic-output", "BOOL"), true);
		expect(screen.getByText("VRAI")).toBeInTheDocument();
	});

	it("affiche une valeur numérique et une durée TIME formatée", () => {
		setup(new Variable("v1", "niveau", "analog-input", "INT"), 42);
		expect(screen.getByText("42")).toBeInTheDocument();

		setup(new Variable("v2", "duree", "memory", "TIME"), 5000);
		expect(screen.getByText("5s")).toBeInTheDocument();
	});

	it("affiche '-' tant que la valeur n'est pas connue", () => {
		setup(new Variable("v1", "moteur", "logic-output", "BOOL"), undefined);
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("n'affiche rien pour une ligne qui n'est pas une variable (ligne d'ajout)", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { dialect: Dialect.FR, variables: [] },
				simulationVariablesStates: {},
			}),
		);
		const { container } = render(<VariableValueCell variableId="new-variable" />);
		expect(container).toBeEmptyDOMElement();
	});

	it("met en valeur VRAI et les nombres non nuls, grise FAUX et 0", () => {
		const badge = (text: string) => screen.getByText(text);

		setup(new Variable("v1", "moteur", "logic-output", "BOOL"), true);
		expect(badge("VRAI")).toHaveAttribute("data-inactive", "false");

		setup(new Variable("v2", "voyant", "logic-output", "BOOL"), false);
		expect(badge("FAUX")).toHaveAttribute("data-inactive", "true");

		setup(new Variable("v3", "niveau", "analog-input", "INT"), 0);
		expect(badge("0")).toHaveAttribute("data-inactive", "true");

		setup(new Variable("v4", "compteur", "memory", "INT"), -3);
		expect(badge("-3")).toHaveAttribute("data-inactive", "false");
	});
});
