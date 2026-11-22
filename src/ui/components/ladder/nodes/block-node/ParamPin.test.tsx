/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { Dialect } from "@/expression-language/dialect.enum";
import { BlockPortSpec } from "@/schemas/ladder/block-port.schema";
import {
	READ_ONLY_ZONES,
	VARIABLE_TYPES,
} from "@/schemas/variable/variable.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ParamPin from "./ParamPin";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

const startEditing = jest.fn();
const selectorProps = jest.fn();

jest.mock("@/ui/components/variables/VariableSelector", () => ({
	__esModule: true,
	default: forwardRef(function VariableSelectorMock(
		props: { value: string; onCommit: (v: string) => void },
		ref,
	) {
		selectorProps(props);
		useImperativeHandle(ref, () => ({ startEditing }));
		return (
			<input
				data-testid="selector"
				value={props.value}
				onChange={(e) => props.onCommit(e.target.value)}
			/>
		);
	}),
}));

function spec(overrides: Partial<BlockPortSpec> = {}): BlockPortSpec {
	return {
		suffix: "PV",
		type: "INT",
		kind: "parameter",
		direction: "input",
		generatesVariable: false,
		...overrides,
	};
}

function setup({
	spec: portSpec = spec(),
	value = "",
	side = "left",
	mode = ProjectMode.DESIGN,
	excludedFromExecution = false,
	liveMnemonic = "C1.CV",
	states = { "C1.CV": { value: 7 } } as Record<string, { value: unknown }>,
	dialect = Dialect.FR,
	onCommit = jest.fn(),
}: {
	spec?: BlockPortSpec;
	value?: string;
	side?: "left" | "right";
	mode?: ProjectMode;
	excludedFromExecution?: boolean;
	liveMnemonic?: string;
	states?: Record<string, { value: unknown }>;
	dialect?: Dialect;
	onCommit?: jest.Mock;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			project: { dialect },
			simulationVariablesStatesByMnemonic: states,
		}),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ ladder: { excludedFromExecution } }),
	);
	render(
		<ParamPin
			side={side}
			spec={portSpec}
			value={value}
			liveMnemonic={liveMnemonic}
			onCommit={onCommit}
		/>,
	);
	return { onCommit };
}

const lastSelectorProps = () =>
	selectorProps.mock.calls[selectorProps.mock.calls.length - 1][0];

describe("ParamPin", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche le suffixe du pin et le sélecteur en conception", () => {
		setup({ value: "Compteur" });

		expect(screen.getByText("PV")).toBeInTheDocument();
		expect(screen.getByTestId("selector")).toHaveValue("Compteur");
	});

	it("relaie la valeur validée du sélecteur à onCommit", () => {
		const { onCommit } = setup();

		fireEvent.change(screen.getByTestId("selector"), {
			target: { value: "X" },
		});

		expect(onCommit).toHaveBeenCalledWith("X");
	});

	it("donne le focus au champ sur double-clic du libellé", () => {
		setup();

		fireEvent.doubleClick(screen.getByText("PV"));

		expect(startEditing).toHaveBeenCalledTimes(1);
	});

	describe("liveText", () => {
		it("affiche la valeur de la variable générée en simulation quand value est vide", () => {
			setup({ mode: ProjectMode.SIMULATION });

			expect(screen.getByText("7")).toBeInTheDocument();
			expect(screen.queryByTestId("selector")).not.toBeInTheDocument();
		});

		it("formate un booléen selon le dialecte", () => {
			setup({
				spec: spec({ type: "BOOL" }),
				mode: ProjectMode.SIMULATION,
				states: { "C1.CV": { value: true } },
				dialect: Dialect.EN,
			});

			expect(screen.getByText("TRUE")).toBeInTheDocument();
		});

		it("garde le sélecteur quand value n'est pas vide", () => {
			setup({ value: "Compteur", mode: ProjectMode.SIMULATION });

			expect(screen.getByTestId("selector")).toBeInTheDocument();
			expect(screen.queryByText("7")).not.toBeInTheDocument();
		});

		it("garde le sélecteur en conception", () => {
			setup();

			expect(screen.getByTestId("selector")).toBeInTheDocument();
			expect(screen.queryByText("7")).not.toBeInTheDocument();
		});

		it("n'affiche pas de texte live pour un pin de type ANY", () => {
			setup({
				spec: spec({ type: "ANY" }),
				mode: ProjectMode.SIMULATION,
			});

			expect(screen.getByTestId("selector")).toBeInTheDocument();
			expect(screen.queryByText("7")).not.toBeInTheDocument();
		});

		it("n'affiche pas de texte live si le programme est exclu de l'exécution", () => {
			setup({
				mode: ProjectMode.SIMULATION,
				excludedFromExecution: true,
			});

			expect(screen.getByTestId("selector")).toBeInTheDocument();
			expect(screen.queryByText("7")).not.toBeInTheDocument();
		});

		it("garde le sélecteur si le pin n'a pas de mnémonique live", () => {
			setup({ mode: ProjectMode.SIMULATION, liveMnemonic: "" });

			expect(screen.getByTestId("selector")).toBeInTheDocument();
		});

		it("garde le sélecteur tant que la variable live n'a pas de valeur", () => {
			setup({ mode: ProjectMode.SIMULATION, states: {} });

			expect(screen.getByTestId("selector")).toBeInTheDocument();
		});
	});

	describe("props du sélecteur", () => {
		it("un pin ANY accepte tous les types de variable", () => {
			setup({ spec: spec({ type: "ANY" }) });

			expect(lastSelectorProps().typeFilter).toEqual([...VARIABLE_TYPES]);
		});

		it("un pin booléen n'accepte que les types booléens", () => {
			setup({ spec: spec({ type: "BOOL" }) });

			expect(lastSelectorProps().typeFilter).toEqual(["BOOL"]);
		});

		it("un pin numérique accepte tous les types numériques, pas seulement le sien", () => {
			setup({ spec: spec({ type: "INT" }) });

			expect(lastSelectorProps().typeFilter).toEqual([
				"INT",
				"DINT",
				"WORD",
				"DWORD",
				"REAL",
				"TIME",
			]);
		});

		it("un pin TIME est filtré comme un pin numérique", () => {
			setup({ spec: spec({ type: "TIME" }) });

			expect(lastSelectorProps().typeFilter).toContain("INT");
			expect(lastSelectorProps().typeFilter).not.toContain("BOOL");
		});

		it("transmet les littéraux acceptés", () => {
			setup({ spec: spec({ acceptedLiterals: ["number"] }) });

			expect(lastSelectorProps().acceptedLiterals).toEqual(["number"]);
		});

		it("exclut les variables en lecture seule quand excludeInputVariable est actif", () => {
			setup({ spec: spec({ excludeInputVariable: true }) });

			expect(lastSelectorProps().excludeDirection).toBe("IN");
			expect(lastSelectorProps().excludeZones).toBe(READ_ONLY_ZONES);
		});

		it("n'exclut rien sans excludeInputVariable", () => {
			setup();

			expect(lastSelectorProps().excludeDirection).toBeUndefined();
			expect(lastSelectorProps().excludeZones).toBeUndefined();
		});

		it("masque le statut du sélecteur si le programme est exclu", () => {
			setup({ excludedFromExecution: true });

			expect(lastSelectorProps().suppressStatus).toBe(true);
		});

		it("aligne le sélecteur selon le côté", () => {
			setup({ side: "left" });
			expect(lastSelectorProps().align).toBe("right");

			setup({ side: "right" });
			expect(lastSelectorProps().align).toBe("left");
		});
	});
});
