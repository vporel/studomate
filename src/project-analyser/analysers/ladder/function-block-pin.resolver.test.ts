import Variable from "@/schemas/variable/variable.schema";
import { resolveFunctionBlockPin } from "./function-block-pin.resolver";

describe("resolveFunctionBlockPin", () => {
	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("résout 'empty' pour une pinoche vide", () => {
		expect(resolveFunctionBlockPin("", variablesMap(), "number")).toEqual({ kind: "empty" });
	});

	it("résout 'undeclared' pour une variable inconnue", () => {
		expect(resolveFunctionBlockPin("Inconnue", variablesMap(), "number")).toEqual({ kind: "undeclared" });
	});

	it("résout 'ok' pour une variable déclarée du bon type natif", () => {
		const variable = new Variable("v1", "MaVar", "memory", "INT");
		expect(resolveFunctionBlockPin("MaVar", variablesMap(variable), "number")).toEqual({
			kind: "ok",
			variable,
		});
	});

	it("résout 'invalid-type' pour une variable déclarée du mauvais type natif", () => {
		const variable = new Variable("v1", "MaVar", "memory", "BOOL");
		expect(resolveFunctionBlockPin("MaVar", variablesMap(variable), "number")).toEqual({
			kind: "invalid-type",
			variable,
		});
	});

	it("résout 'literal' quand le prédicat de littéral accepte la syntaxe et la valeur", () => {
		const resolution = resolveFunctionBlockPin("10", variablesMap(), "number", {
			isLiteralSyntax: () => true,
			isLiteralValid: () => true,
		});
		expect(resolution).toEqual({ kind: "literal" });
	});

	it("résout 'invalid-constant' quand la syntaxe est reconnue mais la valeur invalide", () => {
		const resolution = resolveFunctionBlockPin("T#abc", variablesMap(), "number", {
			isLiteralSyntax: () => true,
			isLiteralValid: () => false,
		});
		expect(resolution).toEqual({ kind: "invalid-constant" });
	});

	it("résout 'invalid-type' pour un type natif correspondant mais un VariableType exclu (ex. TIME pour un counter)", () => {
		const variable = new Variable("v1", "MaConsigne", "memory", "TIME");
		const resolution = resolveFunctionBlockPin(
			"MaConsigne",
			variablesMap(variable),
			"number",
			undefined,
			["TIME"],
		);
		expect(resolution).toEqual({ kind: "invalid-type", variable });
	});

	it("n'exclut pas un VariableType hors de la liste d'exclusion", () => {
		const variable = new Variable("v1", "MaVar", "memory", "INT");
		const resolution = resolveFunctionBlockPin("MaVar", variablesMap(variable), "number", undefined, ["TIME"]);
		expect(resolution).toEqual({ kind: "ok", variable });
	});

	it("retombe sur la résolution de variable quand le pin n'a pas la syntaxe d'un littéral", () => {
		const variable = new Variable("v1", "MaVar", "memory", "INT");
		const resolution = resolveFunctionBlockPin("MaVar", variablesMap(variable), "number", {
			isLiteralSyntax: () => false,
			isLiteralValid: () => true,
		});
		expect(resolution).toEqual({ kind: "ok", variable });
	});
});
