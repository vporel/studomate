import { Dialect } from "@/expression-language/dialect.enum";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import {
	ActionData,
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import { StepData } from "@/schemas/grafcet/step.schema";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import ElementsCommandsFactory from "./elements-commands.factory";
import NodesFactory from "./nodes.factory";

/**
 * Ces tests n'existent que parce que les factories ne dépendent plus de `GrafcetViewManager` :
 * elles reçoivent la liste des nœuds, pas un accès au flow. Elles tournent donc sans
 * instance React Flow, sans store et sans DOM.
 */
describe("ElementsCommandsFactory (sans instance React Flow)", () => {
	function grafcetWithStep(number: number) {
		return new GrafcetBuilder()
			.addStep(new StepBuilder().id("step-1").number(number).build())
			.build();
	}

	describe("onNodeDataChange", () => {
		it("produit une commande de mise à jour quand la donnée change", () => {
			const grafcet = grafcetWithStep(1);

			const { commands, nodeDataToUpdate } =
				ElementsCommandsFactory.onNodeDataChange(
					"step-1",
					{ number: 5 } as Partial<StepData>,
					grafcet,
					Dialect.FR,
				);

			expect(commands).toHaveLength(1);
			expect(commands[0]).toBeInstanceOf(ElementsUpdateCommand);
			expect((nodeDataToUpdate as StepData).number).toBe(5);
		});

		it("ne produit aucune commande si la donnée est identique", () => {
			const grafcet = grafcetWithStep(1);

			const { commands } = ElementsCommandsFactory.onNodeDataChange(
				"step-1",
				{ number: 1 } as Partial<StepData>,
				grafcet,
				Dialect.FR,
			);

			expect(commands).toHaveLength(0);
		});

		it("ne produit aucune commande pour un nœud inconnu", () => {
			const { commands } = ElementsCommandsFactory.onNodeDataChange(
				"inexistant",
				{ number: 5 } as Partial<StepData>,
				grafcetWithStep(1),
				Dialect.FR,
			);

			expect(commands).toHaveLength(0);
		});

		function grafcetWithBooleanAction(expression: string) {
			return new GrafcetBuilder()
				.addAction(
					new ActionBuilder()
						.id("action-1")
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.CONTINUOUS)
						.expression(expression)
						.build(),
				)
				.build();
		}

		it("applique un changement de type même si l'expression conservée est incohérente", () => {
			const grafcet = grafcetWithBooleanAction("moteur");

			const { commands, nodeDataToUpdate } =
				ElementsCommandsFactory.onNodeDataChange(
					"action-1",
					{ type: ActionType.NUMERIC_VARIABLE } as Partial<ActionData>,
					grafcet,
					Dialect.FR,
				);

			expect(commands).toHaveLength(1);
			expect((nodeDataToUpdate as ActionData).type).toBe(
				ActionType.NUMERIC_VARIABLE,
			);
			expect((nodeDataToUpdate as ActionData).expression).toBe("moteur");
		});

		it("bloque toujours une édition d'expression syntaxiquement invalide", () => {
			const grafcet = grafcetWithBooleanAction("moteur");

			const { commands } = ElementsCommandsFactory.onNodeDataChange(
				"action-1",
				{ expression: "moteur :=" } as Partial<ActionData>,
				grafcet,
				Dialect.FR,
			);

			expect(commands).toHaveLength(0);
		});
	});

	describe("onNodesRemove", () => {
		it("marque le nœud à supprimer", () => {
			const grafcet = grafcetWithStep(1);
			const existingNodes = NodesFactory.getInitialNodes(
				grafcet,
			) as GrafcetNodeType[];

			const { commands, nodesIdsToDelete } =
				ElementsCommandsFactory.onNodesRemove(
					["step-1"],
					grafcet,
					existingNodes,
				);

			expect(nodesIdsToDelete).toEqual(["step-1"]);
			expect(commands.length).toBeGreaterThan(0);
		});

		it("ignore un identifiant absent de la vue", () => {
			const grafcet = grafcetWithStep(1);

			const { nodesIdsToDelete } = ElementsCommandsFactory.onNodesRemove(
				["inexistant"],
				grafcet,
				[],
			);

			expect(nodesIdsToDelete).toEqual([]);
		});
	});

	describe("onNodesAdd", () => {
		function stepNode(id: string, number: unknown) {
			return {
				id,
				type: "step",
				position: { x: 0, y: 0 },
				data: { number },
			} as unknown as GrafcetNodeType;
		}

		it.each([
			["undefined", undefined],
			["une chaîne vide", ""],
			["null", null],
		])(
			"attribue le prochain numéro disponible à une étape dont le numéro est %s",
			(_label, number) => {
				const grafcet = grafcetWithStep(3);

				const { nodesToAdd } = ElementsCommandsFactory.onNodesAdd(
					[stepNode("step-2", number)],
					grafcet,
					[],
				);

				expect((nodesToAdd[0].data as StepData).number).toBe(4);
			},
		);

		it("attribue des numéros distincts à plusieurs étapes sans numéro, à la suite du maximum", () => {
			const { nodesToAdd } = ElementsCommandsFactory.onNodesAdd(
				[
					stepNode("a", undefined),
					stepNode("b", undefined),
					stepNode("c", undefined),
				],
				grafcetWithStep(3),
				[],
			);

			expect(nodesToAdd.map((n) => (n.data as StepData).number)).toEqual([
				4, 5, 6,
			]);
		});

		it("laisse intact le numéro fourni et numérote les autres à la suite", () => {
			const { nodesToAdd } = ElementsCommandsFactory.onNodesAdd(
				[stepNode("a", 9), stepNode("b", undefined), stepNode("c", "")],
				grafcetWithStep(3),
				[],
			);

			expect(nodesToAdd.map((n) => (n.data as StepData).number)).toEqual([
				9, 4, 5,
			]);
		});

		it("numérote 0, 1, 2 dans un grafcet sans étape", () => {
			const { nodesToAdd } = ElementsCommandsFactory.onNodesAdd(
				[
					stepNode("a", undefined),
					stepNode("b", undefined),
					stepNode("c", undefined),
				],
				new GrafcetBuilder().build(),
				[],
			);

			expect(nodesToAdd.map((n) => (n.data as StepData).number)).toEqual([
				0, 1, 2,
			]);
		});

		it("conserve le numéro 0 d'une étape ajoutée", () => {
			const { nodesToAdd } = ElementsCommandsFactory.onNodesAdd(
				[stepNode("step-2", 0)],
				grafcetWithStep(3),
				[],
			);

			expect((nodesToAdd[0].data as StepData).number).toBe(0);
		});
	});
	describe("onNodeChange", () => {
		function grafcetAt(x: number, y: number) {
			return new GrafcetBuilder()
				.addStep(
					new StepBuilder()
						.id("step-1")
						.number(1)
						.position(x, y)
						.dimensions(40, 50)
						.build(),
				)
				.build();
		}

		const positionChange = (
			position: { x: number; y: number } | undefined,
			dragging: boolean,
			id = "step-1",
		) => ({ type: "position" as const, id, position, dragging });

		const dimensionsChange = (
			dimensions: { width: number; height: number } | undefined,
			resizing: boolean,
			id = "step-1",
		) => ({ type: "dimensions" as const, id, dimensions, resizing });

		it("ne produit aucune commande pendant le glisser", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[positionChange({ x: 30, y: 30 }, true)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(0);
		});

		it("produit une commande avec la position précédente quand la position finale diffère", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[positionChange({ x: 30, y: 40 }, false)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(1);
			expect(commands[0]).toBeInstanceOf(ElementsUpdateCommand);
			expect(commands[0].payload[0]).toMatchObject({
				id: "step-1",
				type: "step",
				position: { x: 30, y: 40 },
				previousPosition: { x: 10, y: 20 },
			});
		});

		it("ne produit aucune commande si la position finale est inchangée", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[positionChange({ x: 10, y: 20 }, false)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(0);
		});

		it("ne produit aucune commande pendant le redimensionnement", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[dimensionsChange({ width: 100, height: 100 }, true)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(0);
		});

		it("produit une commande avec la taille précédente quand les dimensions finales diffèrent", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[dimensionsChange({ width: 100, height: 60 }, false)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(1);
			expect(commands[0]).toBeInstanceOf(ElementsUpdateCommand);
			expect(commands[0].payload[0]).toMatchObject({
				id: "step-1",
				size: { width: 100, height: 60 },
				previousSize: { width: 40, height: 50 },
			});
		});

		it("ne produit aucune commande si les dimensions finales sont inchangées", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[dimensionsChange({ width: 40, height: 50 }, false)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(0);
		});

		it("ignore un changement sans position ni dimensions", () => {
			const { commands } = ElementsCommandsFactory.onNodeChange(
				[positionChange(undefined, false), dimensionsChange(undefined, false)],
				grafcetAt(10, 20),
			);

			expect(commands).toHaveLength(0);
		});

		it("lève une erreur pour un identifiant inconnu", () => {
			expect(() =>
				ElementsCommandsFactory.onNodeChange(
					[positionChange({ x: 1, y: 1 }, false, "inconnu")],
					grafcetAt(10, 20),
				),
			).toThrow(/inconnu/);
			expect(() =>
				ElementsCommandsFactory.onNodeChange(
					[dimensionsChange({ width: 1, height: 1 }, false, "inconnu")],
					grafcetAt(10, 20),
				),
			).toThrow(/inconnu/);
		});
	});
});
