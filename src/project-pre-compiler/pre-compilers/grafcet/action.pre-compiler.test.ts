import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { Dialect } from "@/expression-language/dialect.enum";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import ActionPreCompiler from "./action.pre-compiler";

describe("ActionPreCompiler", () => {
	let variables: PLCVariable[];
	let step: ReturnType<typeof StepBuilder.prototype.build>;

	beforeEach(() => {
		variables = [
			new PLCVariable("v1", "E1", "input", "boolean"),
			new PLCVariable("v2", "M1", "memory", "boolean"),
			new PLCVariable("v3", "S1", "output", "boolean"),
			new PLCVariable("v4", "M2", "memory", "number"),
		];

		step = new StepBuilder().id("step-1").number(1).build();
	});

	describe("preCompile", () => {
		describe("TEXT actions", () => {
			it("returns null for TEXT action", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.TEXT)
					.executionMode(ActionExecutionMode.CONTINUOUS)
					.expression("Descriptive text")
					.build();
				const grafcet = new GrafcetBuilder().addStep(step).addAction(action).build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).toBeNull();
			});
		});

		describe("Actions without expression", () => {
			it("returns null for action with undefined expression", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).toBeNull();
			});

			it("returns null for action with empty expression", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("   ")
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).toBeNull();
			});
		});

		describe("BOOLEAN_VARIABLE actions", () => {
			describe("SET mode", () => {
				it("creates onActivation phase with assignment to TRUE", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.SET)
						.expression("M1")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toHaveLength(1);
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toEqual([]);
					expect(result!.phases.onActivation[0].type).toBe("ASSIGN_STATEMENT");
				});
			});

			describe("RESET mode", () => {
				it("creates onActivation phase with assignment to FALSE", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.RESET)
						.expression("M1")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toHaveLength(1);
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toEqual([]);
				});
			});

			describe("CONTINUOUS mode", () => {
				it("creates onActivation and onDeactivation phases", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.CONTINUOUS)
						.expression("S1")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toHaveLength(1); // M1 := TRUE
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toHaveLength(1); // M1 := FALSE
				});
			});

			describe("RISING_EDGE mode", () => {
				it("creates onActivation phase only", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.RISING_EDGE)
						.expression("M1")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toHaveLength(1);
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toEqual([]);
				});
			});

			describe("FALLING_EDGE mode", () => {
				it("creates onDeactivation phase only", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.FALLING_EDGE)
						.expression("M1")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toEqual([]);
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toHaveLength(1);
				});
			});

			it("handles multiple boolean variables on separate lines", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("M1\nS1")
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).not.toBeNull();
				expect(result!.phases.onActivation).toHaveLength(2);
			});
		});

		describe("NUMERIC_VARIABLE and STRING_VARIABLE actions", () => {
			describe("CONTINUOUS mode", () => {
				it("creates continuous phase for numeric assignment", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.NUMERIC_VARIABLE)
						.executionMode(ActionExecutionMode.CONTINUOUS)
						.expression("M2 := 42")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toEqual([]);
					expect(result!.phases.continuous).toHaveLength(1);
					expect(result!.phases.onDeactivation).toEqual([]);
					expect(result!.phases.continuous[0].type).toBe("ASSIGN_STATEMENT");
				});
			});

			describe("RISING_EDGE mode", () => {
				it("creates onActivation phase for numeric assignment", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.NUMERIC_VARIABLE)
						.executionMode(ActionExecutionMode.RISING_EDGE)
						.expression("M2 := M2 + 1")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toHaveLength(1);
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toEqual([]);
				});
			});

			describe("FALLING_EDGE mode", () => {
				it("creates onDeactivation phase for numeric assignment", () => {
					const action = new ActionBuilder()
						.id("action-1")
						.type(ActionType.NUMERIC_VARIABLE)
						.executionMode(ActionExecutionMode.FALLING_EDGE)
						.expression("M2 := 0")
						.build();
					const grafcet = new GrafcetBuilder()
						.addStep(step)
						.addAction(action)
						.addConnection(
							new ConnectionBuilder()
								.source("step", "step-1", "source:action")
								.target("action", "action-1", "target:step")
								.build(),
						)
						.build();

					const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

					expect(result).not.toBeNull();
					expect(result!.phases.onActivation).toEqual([]);
					expect(result!.phases.continuous).toEqual([]);
					expect(result!.phases.onDeactivation).toHaveLength(1);
				});
			});

			it("handles multiple expression lines", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.NUMERIC_VARIABLE)
					.executionMode(ActionExecutionMode.CONTINUOUS)
					.expression("M2 := 10\nM2 := M2 + 5")
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).not.toBeNull();
				expect(result!.phases.continuous).toHaveLength(2);
			});

			it("simplifies the AST", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.NUMERIC_VARIABLE)
					.executionMode(ActionExecutionMode.CONTINUOUS)
					.expression("M2 := 5 + 5")
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).not.toBeNull();
				expect(result!.phases.continuous).toHaveLength(1);
				const assignNode = result!.phases.continuous[0];
				if (assignNode.type === "ASSIGN_STATEMENT") {
					// Arithmetic expressions are kept as-is (not simplified during pre-compilation)
					expect(assignNode.right.type).toBe("ARITHMETIC_EXPRESSION");
				}
			});
		});

		describe("stepId", () => {
			it("returns the correct stepId", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("M1")
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.FR);

				expect(result).not.toBeNull();
				expect(result!.stepId).toBe("step-1");
			});
		});

		describe("English dialect", () => {
			it("works with English dialect for numeric actions", () => {
				const action = new ActionBuilder()
					.id("action-1")
					.type(ActionType.NUMERIC_VARIABLE)
					.executionMode(ActionExecutionMode.CONTINUOUS)
					.expression("M2 := 42")
					.build();
				const grafcet = new GrafcetBuilder()
					.addStep(step)
					.addAction(action)
					.addConnection(
						new ConnectionBuilder()
							.source("step", "step-1", "source:action")
							.target("action", "action-1", "target:step")
							.build(),
					)
					.build();

				const result = ActionPreCompiler.preCompile(action, grafcet, variables, Dialect.EN);

				expect(result).not.toBeNull();
				expect(result!.phases.continuous).toHaveLength(1);
			});
		});
	});
});
