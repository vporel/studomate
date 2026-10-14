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
			simulationVariablesStates:
				value === undefined ? {} : { [variable.id]: { value } },
		}),
	);
	return render(<VariableValueCell variableId={variable.id} />);
}

describe("VariableValueCell", () => {
	it("affiche une valeur booléenne dans le dialecte du projet", () => {
		setup(
			new Variable({
				id: "v1",
				mnemonic: "moteur",
				zone: "logic-output",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
			true,
		);
		expect(screen.getByText("VRAI")).toBeInTheDocument();
	});

	it("affiche une valeur numérique et une durée TIME formatée", () => {
		setup(
			new Variable({
				id: "v1",
				mnemonic: "niveau",
				zone: "analog-input",
				type: "INT",
				dialect: Dialect.FR,
			}),
			42,
		);
		expect(screen.getByText("42")).toBeInTheDocument();

		setup(
			new Variable({
				id: "v2",
				mnemonic: "duree",
				zone: "memory",
				type: "TIME",
				dialect: Dialect.FR,
			}),
			5000,
		);
		expect(screen.getByText("5s")).toBeInTheDocument();
	});

	it("affiche '-' tant que la valeur n'est pas connue", () => {
		setup(
			new Variable({
				id: "v1",
				mnemonic: "moteur",
				zone: "logic-output",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
			undefined,
		);
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("n'affiche rien pour une ligne qui n'est pas une variable (ligne d'ajout)", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { dialect: Dialect.FR, variables: [] },
				simulationVariablesStates: {},
			}),
		);
		const { container } = render(
			<VariableValueCell variableId="new-variable" />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("met en valeur VRAI et les nombres non nuls, grise FAUX et 0", () => {
		const badge = (text: string) => screen.getByText(text);

		setup(
			new Variable({
				id: "v1",
				mnemonic: "moteur",
				zone: "logic-output",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
			true,
		);
		expect(badge("VRAI")).toHaveAttribute("data-inactive", "false");

		setup(
			new Variable({
				id: "v2",
				mnemonic: "voyant",
				zone: "logic-output",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
			false,
		);
		expect(badge("FAUX")).toHaveAttribute("data-inactive", "true");

		setup(
			new Variable({
				id: "v3",
				mnemonic: "niveau",
				zone: "analog-input",
				type: "INT",
				dialect: Dialect.FR,
			}),
			0,
		);
		expect(badge("0")).toHaveAttribute("data-inactive", "true");

		setup(
			new Variable({
				id: "v4",
				mnemonic: "compteur",
				zone: "memory",
				type: "INT",
				dialect: Dialect.FR,
			}),
			-3,
		);
		expect(badge("-3")).toHaveAttribute("data-inactive", "false");
	});
});

describe("VariableValueCell constants", () => {
	it("shows the value of a constant in simulation", () => {
		setup(
			new Variable({
				id: "k",
				mnemonic: "DELAI",
				zone: "constant",
				type: "TIME",
				value: "T#5s",
				dialect: Dialect.FR,
			}),
			5000,
		);

		expect(screen.getByText("5s")).toBeInTheDocument();
	});
});
