import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { Environment } from "@/simulator/interpreter/environment/environment";
import EvaluatorVisitor from "@/simulator/interpreter/evaluator/evaluator.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";

/**
 * Évalue des expressions en marge du programme, à chaque cycle du PLC.
 *
 * Sert à montrer un état que le programme ne calcule pas pour lui-même : par exemple si la
 * réceptivité d'une transition est vraie à cet instant. Ces expressions ne sont pas exécutées
 * par l'automate, elles sont seulement observées.
 *
 * Vit du côté simulateur, et non dans un manager d'interface : construire un environnement et
 * visiter un AST relève du simulateur. L'interface se contente d'enregistrer des expressions
 * et de lire des valeurs.
 */
export default class ExpressionsWatcher {
	private expressions: Map<string, ASTNode> = new Map();
	private values: Map<string, unknown> = new Map();
	private deltaTimeMs: number;

	constructor(deltaTimeMs: number) {
		this.deltaTimeMs = deltaTimeMs;
	}

	/**
	 * @param expressions Expressions à observer, indexées par un identifiant choisi par
	 * l'appelant — pour une transition, son propre identifiant.
	 */
	watch(expressions: Map<string, ASTNode> | Record<string, ASTNode>): void {
		this.expressions =
			expressions instanceof Map ? new Map(expressions) : new Map(Object.entries(expressions));
		this.values.clear();
	}

	/**
	 * Réévalue toutes les expressions observées sur l'état courant des variables.
	 *
	 * L'évaluateur est créé **une fois par cycle** et non une fois par expression : elles
	 * partagent le même environnement, donc le même instant.
	 */
	evaluate(plcVariables: readonly PLCVariable[]): void {
		if (this.expressions.size === 0) return;
		const environment = new Environment(plcVariables.map(PlcVariablesMapper.plcToEnv));
		const evaluator = new EvaluatorVisitor(environment, {
			timers: { deltaTimeMs: this.deltaTimeMs },
		});

		for (const [id, node] of this.expressions) {
			try {
				this.values.set(id, evaluator.visit(node));
			} catch (e) {
				//Une expression qui échoue ne doit pas empêcher les autres d'être évaluées
				this.values.set(id, undefined);
				console.error(`Erreur d'évaluation de l'expression ${id} :`, e);
			}
		}
	}

	/**
	 * @returns La dernière valeur observée, ou `undefined` si l'expression n'a pas encore été
	 * évaluée ou si son évaluation a échoué.
	 */
	getValue(id: string): unknown {
		return this.values.get(id);
	}

	/**
	 * Instantané de toutes les valeurs observées.
	 *
	 * Sert à publier les valeurs dans un état externe (un store) après chaque cycle, pour que
	 * les lecteurs de cet état soient notifiés — le watcher lui-même n'est pas observable.
	 */
	getValuesSnapshot(): Record<string, unknown> {
		return Object.fromEntries(this.values);
	}

	/** Oublie les expressions observées et leurs valeurs. */
	clear(): void {
		this.expressions.clear();
		this.values.clear();
	}
}
