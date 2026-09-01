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
			);

			expect(commands).toHaveLength(0);
		});

		it("ne produit aucune commande pour un nœud inconnu", () => {
			const { commands } = ElementsCommandsFactory.onNodeDataChange(
				"inexistant",
				{ number: 5 } as Partial<StepData>,
				grafcetWithStep(1),
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
});
