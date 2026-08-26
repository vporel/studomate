import Action, { ActionExecutionMode, ActionType } from "../action.schema";
import ActionBuilder from "./action.builder";

describe("ActionBuilder", () => {
	it("builds an action with default values", () => {
		const action = new ActionBuilder().id("action-1").build();

		expect(action).toBeInstanceOf(Action);
		expect(action.id).toBe("action-1");
		expect(action.type).toBe("action");
		expect(action.data.expression).toBe("");
		expect(action.data.type).toBe(ActionType.TEXT);
		expect(action.data.executionMode).toBeNull();
		expect(action.size.width).toBe(Action.DEFAULT_DIMENSIONS.width);
		expect(action.size.height).toBe(Action.DEFAULT_DIMENSIONS.height);
		expect(action.position).toEqual({ x: 0, y: 0 });
	});

	it("builds an action with custom expression", () => {
		const action = new ActionBuilder().id("action-1").expression("x = 10").build();

		expect(action.data.expression).toBe("x = 10");
	});

	it("builds an action with custom type", () => {
		const action = new ActionBuilder().id("action-1").type(ActionType.BOOLEAN_VARIABLE).build();

		expect(action.data.type).toBe(ActionType.BOOLEAN_VARIABLE);
	});

	it("builds an action with custom execution mode", () => {
		const action = new ActionBuilder().id("action-1").executionMode(ActionExecutionMode.SET).build();

		expect(action.data.executionMode).toBe(ActionExecutionMode.SET);
	});

	it("builds an action with custom dimensions", () => {
		const action = new ActionBuilder().id("action-1").dimensions(120, 60).build();

		expect(action.size.width).toBe(120);
		expect(action.size.height).toBe(60);
	});

	it("builds an action with custom position", () => {
		const action = new ActionBuilder().id("action-1").position(50, 75).build();

		expect(action.position).toEqual({ x: 50, y: 75 });
	});

	it("builds a complete action with all properties", () => {
		const action = new ActionBuilder()
			.id("action-1")
			.expression("counter = counter + 1")
			.type(ActionType.NUMERIC_VARIABLE)
			.executionMode(ActionExecutionMode.CONTINUOUS)
			.dimensions(150, 70)
			.position(100, 200)
			.build();

		expect(action.id).toBe("action-1");
		expect(action.data.expression).toBe("counter = counter + 1");
		expect(action.data.type).toBe(ActionType.NUMERIC_VARIABLE);
		expect(action.data.executionMode).toBe(ActionExecutionMode.CONTINUOUS);
		expect(action.size.width).toBe(150);
		expect(action.size.height).toBe(70);
		expect(action.position).toEqual({ x: 100, y: 200 });
	});

	it("allows method chaining", () => {
		const builder = new ActionBuilder();
		const result = builder.id("action-1");

		expect(result).toBe(builder);
	});

	it("builds multiple actions independently", () => {
		const action1 = new ActionBuilder().id("action-1").expression("expr1").build();
		const action2 = new ActionBuilder().id("action-2").expression("expr2").build();

		expect(action1.id).toBe("action-1");
		expect(action1.data.expression).toBe("expr1");
		expect(action2.id).toBe("action-2");
		expect(action2.data.expression).toBe("expr2");
	});
});
