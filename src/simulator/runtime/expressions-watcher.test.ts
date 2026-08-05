import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import ExpressionsWatcher from "./expressions-watcher";

function boolVar(name: string, value: boolean) {
	const v = new PLCVariable(name, name, "memory", "boolean");
	v.setValue(value);
	return v;
}

describe("ExpressionsWatcher", () => {
	it("évalue une expression sur l'état courant des variables", () => {
		const watcher = new ExpressionsWatcher(100);
		watcher.watch({ e1: IdentifiersBuilder.buildIdentifierNode("A", 0) });

		watcher.evaluate([boolVar("A", true)]);

		expect(watcher.getValue("e1")).toBe(true);
	});

	it("reflète le changement de valeur au cycle suivant", () => {
		const watcher = new ExpressionsWatcher(100);
		watcher.watch({ e1: IdentifiersBuilder.buildIdentifierNode("A", 0) });

		watcher.evaluate([boolVar("A", true)]);
		watcher.evaluate([boolVar("A", false)]);

		expect(watcher.getValue("e1")).toBe(false);
	});

	it("évalue une expression composée", () => {
		const watcher = new ExpressionsWatcher(100);
		watcher.watch({
			e1: ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				IdentifiersBuilder.buildIdentifierNode("A", 0),
				IdentifiersBuilder.buildIdentifierNode("B", 0),
			),
		});

		watcher.evaluate([boolVar("A", true), boolVar("B", false)]);

		expect(watcher.getValue("e1")).toBe(false);
	});

	it("retourne undefined pour une expression inconnue", () => {
		expect(new ExpressionsWatcher(100).getValue("jamais-vue")).toBeUndefined();
	});

	// Une expression fautive ne doit pas empêcher les autres d'être évaluées
	it("isole l'échec d'une expression", () => {
		const watcher = new ExpressionsWatcher(100);
		watcher.watch({
			fautive: IdentifiersBuilder.buildIdentifierNode("VariableInexistante", 0),
			saine: LiteralsBuilder.buildBooleanNode(true, 0),
		});

		watcher.evaluate([boolVar("A", true)]);

		expect(watcher.getValue("fautive")).toBeUndefined();
		expect(watcher.getValue("saine")).toBe(true);
	});

	it("oublie les valeurs quand on change d'expressions", () => {
		const watcher = new ExpressionsWatcher(100);
		watcher.watch({ e1: LiteralsBuilder.buildBooleanNode(true, 0) });
		watcher.evaluate([]);

		watcher.watch({ e2: LiteralsBuilder.buildBooleanNode(true, 0) });

		expect(watcher.getValue("e1")).toBeUndefined();
	});

	it("oublie tout à l'arrêt", () => {
		const watcher = new ExpressionsWatcher(100);
		watcher.watch({ e1: LiteralsBuilder.buildBooleanNode(true, 0) });
		watcher.evaluate([]);

		watcher.clear();

		expect(watcher.getValue("e1")).toBeUndefined();
	});
});
