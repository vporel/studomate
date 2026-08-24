/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Variable from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import VariableSelector, { VariableSelectorHandle } from "./VariableSelector";
import { createRef } from "react";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	value = "",
	variables = [] as Variable[],
	typeFilter,
	excludeDirection,
	acceptsTimeLiteral,
	cols,
	onCommit = jest.fn(),
	ref,
}: {
	value?: string;
	variables?: Variable[];
	typeFilter?: Variable["type"][];
	excludeDirection?: "IN" | "OUT" | "INOUT";
	acceptsTimeLiteral?: boolean;
	cols?: ("address" | "mnemonic" | "type" | "scope")[];
	onCommit?: (next: string) => void;
	ref?: React.Ref<VariableSelectorHandle>;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { variables } }),
	);

	render(
		<VariableSelector
			value={value}
			onCommit={onCommit}
			typeFilter={typeFilter}
			excludeDirection={excludeDirection}
			acceptsTimeLiteral={acceptsTimeLiteral}
			cols={cols}
			ref={ref}
		/>,
	);

	return { onCommit };
}

function input(): HTMLInputElement {
	return screen.getByRole("combobox") as HTMLInputElement;
}

describe("VariableSelector — statut affiché", () => {
	it("n'affiche aucun statut quand le mnémonique est vide", () => {
		setup({ value: "" });
		expect(input()).not.toHaveAttribute("data-variable-status");
	});

	it("undeclared : le mnémonique ne correspond à aucune variable connue", () => {
		setup({ value: "INCONNUE", variables: [new Variable("v1", "A", "memory", "BOOL")] });
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
		expect(input()).toHaveAttribute("data-variable-status", "excluded-direction");
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

	it("ok : une constante TIME (T#...) n'est jamais signalée non déclarée, si acceptsTimeLiteral", () => {
		setup({ value: "T#5s", variables: [], acceptsTimeLiteral: true });
		expect(input()).toHaveAttribute("data-variable-status", "ok");
	});

	it("undeclared : une constante TIME reste non déclarée sans acceptsTimeLiteral", () => {
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
		setup({ value: "", variables, typeFilter: ["BOOL"], excludeDirection: "IN" });

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

describe("VariableSelector — startEditing", () => {
	it("donne le focus au champ via la ref", () => {
		const ref = createRef<VariableSelectorHandle>();
		setup({ ref });

		ref.current!.startEditing();

		expect(document.activeElement).toBe(input());
	});
});
