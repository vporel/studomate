/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { i18nWrapper } from "@tests/utils/i18n";
import VariableSelector, { VariableSelectorHandle } from "./VariableSelector";
import { createRef } from "react";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	value = "",
	variables = [] as Variable[],
	typeFilter,
	excludeDirection,
	acceptedLiterals,
	cols,
	onCommit = jest.fn(),
	ref,
	mode = ProjectMode.DESIGN,
	simulationVariablesStates = {} as Record<string, { value: unknown }>,
	showSimulationValue,
	simulationValueProps,
	align,
	label,
}: {
	value?: string;
	variables?: Variable[];
	typeFilter?: Variable["type"][];
	excludeDirection?: "IN" | "OUT" | "INOUT";
	acceptedLiterals?: import("@/expression-language/literals/kind").LiteralKind[];
	cols?: ("address" | "mnemonic" | "type" | "scope")[];
	onCommit?: (next: string) => void;
	ref?: React.Ref<VariableSelectorHandle>;
	mode?: ProjectMode;
	simulationVariablesStates?: Record<string, { value: unknown }>;
	showSimulationValue?: boolean;
	simulationValueProps?: { position?: "TOP" | "BOTTOM" };
	align?: "left" | "center" | "right";
	label?: string;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { variables },
			mode,
			simulationVariablesStates,
		}),
	);

	render(
		<VariableSelector
			value={value}
			onCommit={onCommit}
			typeFilter={typeFilter}
			excludeDirection={excludeDirection}
			acceptedLiterals={acceptedLiterals}
			cols={cols}
			ref={ref}
			showSimulationValue={showSimulationValue}
			simulationValueProps={simulationValueProps}
			align={align}
			label={label}
		/>,
	);

	return { onCommit };
}

describe("VariableSelector — validation différée", () => {
	it("commite la saisie en cours au démontage", () => {
		const onCommit = jest.fn();
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { variables: [] },
				simulationVariablesStates: {},
			}),
		);
		const { unmount } = render(
			<VariableSelector value="" onCommit={onCommit} />,
		);
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "Capteur" },
		});
		unmount();
		expect(onCommit).toHaveBeenCalledWith("Capteur");
	});

	it("ne commite rien au démontage sans saisie en cours", () => {
		const onCommit = jest.fn();
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { variables: [] },
				simulationVariablesStates: {},
			}),
		);
		const { unmount } = render(
			<VariableSelector value="X1" onCommit={onCommit} />,
		);
		unmount();
		expect(onCommit).not.toHaveBeenCalled();
	});
});

function input(): HTMLInputElement {
	return screen.getByRole("combobox") as HTMLInputElement;
}

describe("VariableSelector — statut affiché", () => {
	it("n'affiche aucun statut quand le mnémonique est vide", () => {
		setup({ value: "" });
		expect(input()).not.toHaveAttribute("data-variable-status");
	});

	it("undeclared : le mnémonique ne correspond à aucune variable connue", () => {
		setup({
			value: "INCONNUE",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
		});
		expect(input()).toHaveAttribute("data-variable-status", "undeclared");
	});

	it("wrong-type : la variable existe mais hors du typeFilter", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "INT")],
			typeFilter: ["BOOL"],
		});
		expect(input()).toHaveAttribute("data-variable-status", "wrong-type");
	});

	it("excluded-direction : la variable existe mais sa direction est exclue", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "logic-input", "BOOL")],
			excludeDirection: "IN",
		});
		expect(input()).toHaveAttribute(
			"data-variable-status",
			"excluded-direction",
		);
	});

	it("ok : la variable existe, respecte le typeFilter et n'a pas la direction exclue", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "logic-output", "BOOL")],
			typeFilter: ["BOOL"],
			excludeDirection: "IN",
		});
		expect(input()).toHaveAttribute("data-variable-status", "ok");
	});

	it("ok : une constante TIME (T#...) n'est jamais signalée non déclarée, si 'time' est accepté", () => {
		setup({ value: "T#5s", variables: [], acceptedLiterals: ["time"] });
		expect(input()).toHaveAttribute("data-variable-status", "ok");
	});

	it("undeclared : une constante TIME reste non déclarée si 'time' n'est pas accepté", () => {
		setup({ value: "T#5s", variables: [] });
		expect(input()).toHaveAttribute("data-variable-status", "undeclared");
	});
});

describe("VariableSelector — suggestions", () => {
	it("respecte typeFilter et excludeDirection dans les suggestions proposées", () => {
		const variables = [
			new Variable("v1", "Bonne", "logic-output", "BOOL"),
			new Variable("v2", "MauvaisType", "memory", "INT"),
			new Variable("v3", "MauvaiseDirection", "logic-input", "BOOL"),
		];
		setup({
			value: "",
			variables,
			typeFilter: ["BOOL"],
			excludeDirection: "IN",
		});

		fireEvent.focus(input());

		expect(screen.getByText("Bonne")).toBeInTheDocument();
		expect(screen.queryByText("MauvaisType")).not.toBeInTheDocument();
		expect(screen.queryByText("MauvaiseDirection")).not.toBeInTheDocument();
	});

	it("n'affiche aucun popup de suggestions quand rien ne correspond au texte saisi", () => {
		const variables = [new Variable("v1", "Bonne", "memory", "BOOL")];
		setup({ value: "", variables });

		fireEvent.focus(input());
		expect(screen.getByText("Bonne")).toBeInTheDocument();

		fireEvent.change(input(), { target: { value: "T#5s" } });
		expect(screen.queryByText("Bonne")).not.toBeInTheDocument();
		expect(screen.queryByText("Mnémonique")).not.toBeInTheDocument();
	});

	it("ne démonte pas la liste de suggestions entre deux frappes qui la gardent non vide", () => {
		const variables = [
			new Variable("v1", "Moteur", "memory", "BOOL"),
			new Variable("v2", "Marche", "memory", "BOOL"),
		];
		setup({ value: "", variables });

		fireEvent.focus(input());
		const listboxBefore = screen.getByRole("listbox");

		fireEvent.change(input(), { target: { value: "M" } });
		fireEvent.change(input(), { target: { value: "Ma" } });

		expect(screen.getByRole("listbox")).toBe(listboxBefore);
		expect(screen.getByText("Marche")).toBeInTheDocument();
		expect(screen.getByText("Mnémonique")).toBeInTheDocument();
	});
});

describe("VariableSelector — colonnes", () => {
	it("restreint les colonnes affichées mais garde toujours mnemonic", () => {
		const variables = [new Variable("v1", "A", "logic-input", "BOOL")];
		setup({ value: "", variables, cols: ["type"] });

		fireEvent.focus(input());

		expect(screen.getByText("Type")).toBeInTheDocument();
		expect(screen.getByText("Mnémonique")).toBeInTheDocument();
		expect(screen.queryByText("Scope")).not.toBeInTheDocument();
	});
});

describe("VariableSelector — menu contextuel", () => {
	function setupMenu({
		value,
		variables,
		disableContextMenu,
	}: {
		value: string;
		variables: Variable[];
		disableContextMenu?: boolean;
	}) {
		const setCrossReferenceFilter = jest.fn();
		const setCrossReferenceResultVisible = jest.fn();
		const openPage = jest.fn();
		const setVariableToReveal = jest.fn();
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: { variables },
				simulationVariablesStates: {},
				setCrossReferenceFilter,
				setCrossReferenceResultVisible,
				pagesManager: { openPage },
				setVariableToReveal,
			}),
		);
		render(
			<VariableSelector
				value={value}
				onCommit={jest.fn()}
				disableContextMenu={disableContextMenu}
			/>,
			{ wrapper: i18nWrapper() },
		);
		return {
			setCrossReferenceFilter,
			setCrossReferenceResultVisible,
			openPage,
			setVariableToReveal,
		};
	}

	it("ouvre le menu au clic droit quand le champ contient une variable réelle", () => {
		setupMenu({
			value: "M0",
			variables: [new Variable("v1", "M0", "memory", "BOOL")],
		});

		input().focus();
		const event = fireEvent.contextMenu(input());

		expect(event).toBe(false); // preventDefault appelé
		expect(screen.getByText("Références croisées")).toBeInTheDocument();
		// le champ est blurré → le popper de suggestions se ferme au profit du menu contextuel
		expect(document.activeElement).not.toBe(input());
	});

	it("ignore le clic droit quand le contenu n'est pas une variable déclarée", () => {
		setupMenu({
			value: "PASUNEVAR",
			variables: [new Variable("v1", "M0", "memory", "BOOL")],
		});

		const event = fireEvent.contextMenu(input());

		expect(event).toBe(true); // menu natif laissé au navigateur
		expect(screen.queryByText("Références croisées")).not.toBeInTheDocument();
	});

	it("n'ouvre aucun menu quand disableContextMenu est vrai", () => {
		setupMenu({
			value: "M0",
			variables: [new Variable("v1", "M0", "memory", "BOOL")],
			disableContextMenu: true,
		});

		fireEvent.contextMenu(input());

		expect(screen.queryByText("Références croisées")).not.toBeInTheDocument();
	});

	it("« Ouvrir la déclaration » ouvre la page de la zone et cible la ligne", () => {
		const { openPage, setVariableToReveal } = setupMenu({
			value: "M0",
			variables: [new Variable("v1", "M0", "memory", "BOOL")],
		});

		fireEvent.contextMenu(input());
		fireEvent.click(screen.getByText("Ouvrir la déclaration"));

		expect(openPage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "memory-variables" }),
		);
		expect(setVariableToReveal).toHaveBeenCalledWith("v1");
	});

	it("« Références croisées » filtre sur le mnémonique et ouvre le panneau", () => {
		const { setCrossReferenceFilter, setCrossReferenceResultVisible } =
			setupMenu({
				value: "M0",
				variables: [new Variable("v1", "M0", "memory", "BOOL")],
			});

		fireEvent.contextMenu(input());
		fireEvent.click(screen.getByText("Références croisées"));

		expect(setCrossReferenceFilter).toHaveBeenCalledWith("M0");
		expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(true);
	});
});

describe("VariableSelector — startEditing", () => {
	it("donne le focus au champ via la ref", () => {
		const ref = createRef<VariableSelectorHandle>();
		setup({ ref });

		ref.current!.startEditing();

		expect(document.activeElement).toBe(input());
	});
});

describe("VariableSelector — valeur de simulation", () => {
	it("n'affiche rien en mode DESIGN", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.DESIGN,
			simulationVariablesStates: { v1: { value: true } },
		});
		expect(screen.queryByText("VRAI")).not.toBeInTheDocument();
	});

	it("affiche la valeur BOOL formatée en simulation", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
		});
		expect(screen.getByText("VRAI")).toBeInTheDocument();
	});

	it("affiche la valeur TIME formatée en simulation", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "TIME")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: 5000 } },
		});
		expect(screen.getByText("5s")).toBeInTheDocument();
	});

	it("affiche la valeur INT telle quelle en simulation", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "INT")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: 42 } },
		});
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("n'affiche rien quand showSimulationValue vaut false", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
			showSimulationValue: false,
		});
		expect(screen.queryByText("VRAI")).not.toBeInTheDocument();
	});

	it("n'affiche rien quand le mnémonique ne correspond à aucune variable déclarée", () => {
		setup({
			value: "INCONNUE",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
		});
		expect(screen.queryByText("VRAI")).not.toBeInTheDocument();
	});

	it("n'affiche rien tant que la valeur n'est pas encore connue", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: {},
		});
		expect(screen.queryByText("VRAI")).not.toBeInTheDocument();
		expect(screen.queryByText("FAUX")).not.toBeInTheDocument();
	});
});

describe("VariableSelector — position de la valeur de simulation", () => {
	it("positionne la valeur au-dessus du champ par défaut (TOP)", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
		});
		expect(screen.getByText("VRAI")).toHaveStyle({ bottom: "100%" });
	});

	it("positionne la valeur en dessous du champ avec position: BOTTOM", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
			simulationValueProps: { position: "BOTTOM" },
		});
		expect(screen.getByText("VRAI")).toHaveStyle({ top: "100%" });
	});
});

describe("VariableSelector — alignement", () => {
	it("centre le texte par défaut en apparence compacte (sans label)", () => {
		setup({ value: "A", variables: [] });
		expect(input()).toHaveStyle({ textAlign: "center" });
	});

	it("aligne le texte à gauche par défaut en apparence bordée (avec label)", () => {
		setup({ value: "A", variables: [], label: "Variable" });
		expect(input()).toHaveStyle({ textAlign: "left" });
	});

	it("respecte align quand il est fourni", () => {
		setup({ value: "A", variables: [], align: "right" });
		expect(input()).toHaveStyle({ textAlign: "right" });
	});

	it("cale la valeur de simulation sur le même bord que le texte (align: right)", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
			align: "right",
		});
		expect(screen.getByText("VRAI")).toHaveStyle({
			right: "0px",
			marginRight: "3px",
		});
	});

	it("cale la valeur de simulation sur le même bord que le texte (align: left)", () => {
		setup({
			value: "A",
			variables: [new Variable("v1", "A", "memory", "BOOL")],
			mode: ProjectMode.SIMULATION,
			simulationVariablesStates: { v1: { value: true } },
			align: "left",
		});
		expect(screen.getByText("VRAI")).toHaveStyle({
			left: "0px",
			marginLeft: "3px",
		});
	});
});
