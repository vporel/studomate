import ActionBuilder from "./builders/action.builder";
import { ActionExecutionMode, ActionType } from "./action.schema";

describe("Action", () => {
	describe("fixNewDataConsistency", () => {
		it("conserve l'expression au changement de type", () => {
			const action = new ActionBuilder()
				.id("a1")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.expression("moteur")
				.build();

			const fixed = action.fixNewDataConsistency(
				{ type: ActionType.NUMERIC_VARIABLE },
				action.data,
			);

			expect(fixed).not.toHaveProperty("expression");
		});

		it("recale le mode d'exécution s'il devient incompatible avec le nouveau type", () => {
			const action = new ActionBuilder()
				.id("a1")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("moteur")
				.build();

			const fixed = action.fixNewDataConsistency(
				{ type: ActionType.NUMERIC_VARIABLE },
				action.data,
			);

			expect(fixed.executionMode).toBe(ActionExecutionMode.CONTINUOUS);
		});

		it("laisse le mode d'exécution intact s'il reste compatible", () => {
			const action = new ActionBuilder()
				.id("a1")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.expression("compteur := 1")
				.build();

			const fixed = action.fixNewDataConsistency(
				{ type: ActionType.STRING_VARIABLE },
				action.data,
			);

			expect(fixed).toEqual({ type: ActionType.STRING_VARIABLE });
		});

		it("met le mode d'exécution à null en passant au type TEXT", () => {
			const action = new ActionBuilder()
				.id("a1")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.expression("moteur")
				.build();

			const fixed = action.fixNewDataConsistency(
				{ type: ActionType.TEXT },
				action.data,
			);

			expect(fixed.executionMode).toBeNull();
			expect(fixed).not.toHaveProperty("expression");
		});
	});
});
