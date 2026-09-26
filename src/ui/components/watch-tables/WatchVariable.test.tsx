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
			simulationVariablesStates:
				value === undefined ? {} : { [variable.id]: { value } },
		}),
	);
	render(<WatchVariable variable={variable} />);
	return { setPhysicalInputValue, setMemoryValue };
}

describe("WatchVariable — variables booléennes", () => {
	it("affiche VRAI/FAUX (dialecte FR) pour une sortie, sans contrôle éditable", () => {
		setup({
			variable: new Variable("v1", "Q0", "logic-output", "BOOL"),
			value: true,
			dialect: Dialect.FR,
		});
		expect(screen.getByText("VRAI")).toBeInTheDocument();
		expect(screen.queryByRole("switch")).not.toBeInTheDocument();
	});

	it("affiche TRUE/FALSE (dialecte EN) pour une sortie", () => {
		setup({
			variable: new Variable("v1", "Q0", "logic-output", "BOOL"),
			value: false,
			dialect: Dialect.EN,
		});
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
		setup({
			variable: new Variable("v1", "AQ0", "analog-output", "INT"),
			value: 42,
		});
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	});

	it("affiche un champ éditable pour une entrée numérique, et tronque en entier si le type n'est pas REAL", () => {
		const { setPhysicalInputValue } = setup({
			variable: new Variable("v1", "AI0", "analog-input", "INT"),
			value: 0,
		});

		fireEvent.change(screen.getByRole("spinbutton"), {
			target: { value: "7" },
		});

		expect(setPhysicalInputValue).toHaveBeenCalledWith("v1", 7);
	});

	it("ne tronque pas les valeurs REAL", () => {
		const { setMemoryValue } = setup({
			variable: new Variable("v1", "R0", "memory", "REAL"),
			value: 0,
		});

		fireEvent.change(screen.getByRole("spinbutton"), {
			target: { value: "3.5" },
		});

		expect(setMemoryValue).toHaveBeenCalledWith("v1", 3.5);
	});

	it("empêche la saisie de '.' pour une variable numérique non REAL", () => {
		setup({
			variable: new Variable("v1", "AI0", "analog-input", "INT"),
			value: 0,
		});
		const input = screen.getByRole("spinbutton");
		const event = new KeyboardEvent("keydown", {
			key: ".",
			bubbles: true,
			cancelable: true,
		});
		const prevented = !input.dispatchEvent(event);
		expect(prevented).toBe(true);
	});
});

describe("WatchVariable — comportement physique des entrées", () => {
	const withBehavior = (variable: Variable, behavior: Variable["behavior"]) =>
		variable.update({ behavior });

	it("bouton poussoir NO : VRAI à l'appui, FAUX au relâchement", () => {
		const { setPhysicalInputValue } = setup({
			variable: withBehavior(new Variable("v1", "marche", "logic-input", "BOOL"), {
				kind: "push-button-no",
				params: null,
			}),
			value: false,
		});
		const button = screen.getByRole("button", { name: "marche" });

		fireEvent.pointerDown(button);
		fireEvent.pointerUp(button);

		expect(setPhysicalInputValue.mock.calls).toEqual([
			["v1", true],
			["v1", false],
		]);
	});

	it("bouton poussoir NF : FAUX à l'appui, VRAI au relâchement, affiché enfoncé quand FAUX", () => {
		const { setPhysicalInputValue } = setup({
			variable: withBehavior(new Variable("v1", "arret", "logic-input", "BOOL"), {
				kind: "push-button-nc",
				params: null,
			}),
			value: false,
		});
		const button = screen.getByRole("button", { name: "arret" });
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(button).toHaveTextContent("");
		expect(screen.getByText("FAUX")).toBeInTheDocument();

		fireEvent.pointerDown(button);
		fireEvent.pointerLeave(button);

		expect(setPhysicalInputValue.mock.calls).toEqual([
			["v1", false],
			["v1", true],
		]);
	});

	it("bouton poussoir : Espace maintenu appuie une seule fois, relâché revient au repos", () => {
		const { setPhysicalInputValue } = setup({
			variable: withBehavior(new Variable("v1", "marche", "logic-input", "BOOL"), {
				kind: "push-button-no",
				params: null,
			}),
			value: false,
		});
		const button = screen.getByRole("button", { name: "marche" });

		fireEvent.keyDown(button, { key: " " });
		fireEvent.keyDown(button, { key: " " });
		fireEvent.keyUp(button, { key: " " });

		expect(setPhysicalInputValue.mock.calls).toEqual([
			["v1", true],
			["v1", false],
		]);
	});

	it("bouton poussoir : un relâchement sans appui préalable n'écrit rien", () => {
		const { setPhysicalInputValue } = setup({
			variable: withBehavior(new Variable("v1", "marche", "logic-input", "BOOL"), {
				kind: "push-button-no",
				params: null,
			}),
			value: false,
		});

		fireEvent.pointerLeave(screen.getByRole("button", { name: "marche" }));

		expect(setPhysicalInputValue).not.toHaveBeenCalled();
	});

	it("commutateur NF : la position actionnée écrit FAUX", () => {
		const { setPhysicalInputValue } = setup({
			variable: withBehavior(new Variable("v1", "arret", "logic-input", "BOOL"), {
				kind: "toggle-switch-nc",
				params: null,
			}),
			value: true,
		});
		const control = screen.getByRole("switch");
		expect(control).not.toBeChecked();

		fireEvent.click(control);

		expect(setPhysicalInputValue).toHaveBeenCalledWith("v1", false);
	});

	it("curseur : affiche la valeur et écrit la valeur choisie", () => {
		const { setPhysicalInputValue } = setup({
			variable: withBehavior(new Variable("v1", "niveau", "analog-input", "INT"), {
				kind: "slider",
				params: { min: 0, max: 100 },
			}),
			value: 40,
		});
		const slider = screen.getByRole("slider", { name: "niveau" });
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
		expect(screen.getByText("40")).toBeInTheDocument();

		fireEvent.change(slider, { target: { value: 70 } });

		expect(setPhysicalInputValue).toHaveBeenCalledWith("v1", 70);
	});
});
