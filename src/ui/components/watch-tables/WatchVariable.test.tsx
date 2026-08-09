/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "../projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import WatchVariable from "./WatchVariable";

jest.mock("../projects/ProjectContext");

function setup({
	variable,
	value,
	dialect = Dialect.FR,
	setPhysicalInputValue = jest.fn(),
	setMemoryValue = jest.fn(),
}: {
	variable: Variable;
	value?: any;
	dialect?: Dialect;
	setPhysicalInputValue?: jest.Mock;
	setMemoryValue?: jest.Mock;
}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { dialect },
			simulationManager: { setPhysicalInputValue, setMemoryValue },
			simulationVariablesStates: value === undefined ? {} : { [variable.id]: { value } },
		}),
	);
	render(<WatchVariable variable={variable} />);
	return { setPhysicalInputValue, setMemoryValue };
}

describe("WatchVariable — variables booléennes", () => {
	it("affiche VRAI/FAUX (dialecte FR) pour une sortie, sans contrôle éditable", () => {
		setup({ variable: new Variable("v1", "Q0", "logic-output", "BOOL"), value: true, dialect: Dialect.FR });
		expect(screen.getByText("VRAI")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("affiche TRUE/FALSE (dialecte EN) pour une sortie", () => {
		setup({ variable: new Variable("v1", "Q0", "logic-output", "BOOL"), value: false, dialect: Dialect.EN });
		expect(screen.getByText("FALSE")).toBeInTheDocument();
	});

	it("affiche '-' quand la valeur n'est pas encore connue", () => {
		setup({ variable: new Variable("v1", "Q0", "logic-output", "BOOL") });
		expect(screen.getByText("-")).toBeInTheDocument();
	});

	it("affiche un interrupteur pour une entrée, et appelle setPhysicalInputValue au changement", () => {
		const { setPhysicalInputValue, setMemoryValue } = setup({
			variable: new Variable("v1", "I0", "logic-input", "BOOL"),
			value: false,
		});

		fireEvent.click(screen.getByRole("switch"));

		expect(setPhysicalInputValue).toHaveBeenCalledWith("v1", true);
		expect(setMemoryValue).not.toHaveBeenCalled();
	});

	it("appelle setMemoryValue pour une variable mémoire (ni IN ni OUT)", () => {
		const { setMemoryValue, setPhysicalInputValue } = setup({
			variable: new Variable("v1", "M0", "memory", "BOOL"),
			value: false,
		});

		fireEvent.click(screen.getByRole("switch"));

		expect(setMemoryValue).toHaveBeenCalledWith("v1", true);
		expect(setPhysicalInputValue).not.toHaveBeenCalled();
	});
});

describe("WatchVariable — variables non booléennes", () => {
	it("affiche la valeur en lecture seule pour une sortie", () => {
		setup({ variable: new Variable("v1", "AQ0", "analog-output", "INT"), value: 42 });
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	});

	it("affiche un champ éditable pour une entrée numérique, et tronque en entier si le type n'est pas REAL", () => {
		const { setPhysicalInputValue } = setup({
			variable: new Variable("v1", "AI0", "analog-input", "INT"),
			value: 0,
		});

		fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "7" } });

		expect(setPhysicalInputValue).toHaveBeenCalledWith("v1", 7);
	});

	it("ne tronque pas les valeurs REAL", () => {
		const { setMemoryValue } = setup({
			variable: new Variable("v1", "R0", "memory", "REAL"),
			value: 0,
		});

		fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3.5" } });

		expect(setMemoryValue).toHaveBeenCalledWith("v1", 3.5);
	});

	it("empêche la saisie de '.' pour une variable numérique non REAL", () => {
		setup({ variable: new Variable("v1", "AI0", "analog-input", "INT"), value: 0 });
		const input = screen.getByRole("spinbutton");
		const event = new KeyboardEvent("keydown", { key: ".", bubbles: true, cancelable: true });
		const prevented = !input.dispatchEvent(event);
		expect(prevented).toBe(true);
	});
});
