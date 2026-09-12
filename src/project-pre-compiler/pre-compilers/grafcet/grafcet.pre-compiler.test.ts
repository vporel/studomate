import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { Dialect } from "@/expression-language/dialect.enum";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import ProjectPreCompilerError from "@/project-pre-compiler/project.pre-compiler.error";
import GrafcetPreCompiler from "./grafcet.pre-compiler";

describe("GrafcetPreCompiler", () => {
	let variables: PLCVariable[];
	let errors: ProjectPreCompilerError[];

	beforeEach(() => {
		variables = [
			new PLCVariable("v1", "E1", "input", "boolean"),
			new PLCVariable("v2", "M1", "memory", "boolean"),
		];
		errors = [];
	});

	describe("preCompile", () => {
		it("compiles a simple grafcet with one step", () => {
			const step = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
			const grafcet = new GrafcetBuilder().addStep(step).build();

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			expect(result.steps.size).toBe(1);
			expect(result.steps.get("step-1")).toBeDefined();
			expect(result.transitions.size).toBe(0);
			expect(result.actions.size).toBe(0);
			expect(errors).toEqual([]);
		});

		it("compiles steps with transitions", () => {
			const step1 = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet = new GrafcetBuilder()
				.addStep(step1)
				.addStep(step2)
				.addTransition(transition)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-1", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.build();

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			expect(result.steps.size).toBe(2);
			expect(result.transitions.size).toBe(1);
			expect(result.transitions.get("trans-1")).toBeDefined();
			expect(errors).toEqual([]);
		});

		it("compiles actions", () => {
			const step = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
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

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			expect(result.actions.size).toBe(1);
			expect(result.actions.get("action-1")).toBeDefined();
			expect(result.actions.get("action-1")).not.toBeUndefined();
			expect(errors).toEqual([]);
		});

		it("does not add TEXT actions to the compiled result", () => {
			const step = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
			const action = new ActionBuilder()
				.id("action-1")
				.type(ActionType.TEXT)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.expression("Description")
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

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			expect(result.actions.size).toBe(0);
			expect(errors).toEqual([]);
		});

		it("generates memo variables for each step", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet = new GrafcetBuilder()
				.addStep(step1)
				.addStep(step2)
				.build();
			const initialVariableCount = variables.length;

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			expect(result.stepsMemos.size).toBe(2);
			expect(result.stepsMemos.get("step-1")).toBeDefined();
			expect(result.stepsMemos.get("step-2")).toBeDefined();
			// Each step should have generated one memo variable
			expect(variables.length).toBe(initialVariableCount + 2);
		});

		it("memo variables have unique names", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const grafcet = new GrafcetBuilder()
				.addStep(step1)
				.addStep(step2)
				.build();

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			const memo1 = result.stepsMemos.get("step-1")!.variable;
			const memo2 = result.stepsMemos.get("step-2")!.variable;
			expect(memo1.getName()).not.toBe(memo2.getName());
		});

		it("memo variables are added to the variables array", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder().addStep(step).build();
			const initialCount = variables.length;

			GrafcetPreCompiler.preCompile(grafcet, variables, Dialect.FR, errors);

			expect(variables.length).toBe(initialCount + 1);
			expect(variables[initialCount].getName()).toBe("_GeneratedMemo_0");
		});

		it("memo nodes are identifier nodes", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const grafcet = new GrafcetBuilder().addStep(step).build();

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			const memo = result.stepsMemos.get("step-1")!;
			expect(memo.node.type).toBe("IDENTIFIER");
			expect(memo.node.value).toBe("_GeneratedMemo_0");
		});

		describe("transitionObservations", () => {
			it("génère une variable de mémoire booléenne par transition", () => {
				const t1 = new TransitionBuilder()
					.id("trans-1")
					.expression("E1 = VRAI")
					.build();
				const t2 = new TransitionBuilder()
					.id("trans-2")
					.expression("M1 = FAUX")
					.build();
				const grafcet = new GrafcetBuilder()
					.addTransition(t1)
					.addTransition(t2)
					.build();
				const initialCount = variables.length;

				const result = GrafcetPreCompiler.preCompile(
					grafcet,
					variables,
					Dialect.FR,
					errors,
				);

				expect(result.transitionObservations.size).toBe(2);
				const obs1 = result.transitionObservations.get("trans-1")!;
				expect(obs1.variable.getScope()).toBe("memory");
				expect(obs1.variable.getType()).toBe("boolean");
				expect(variables).toContain(obs1.variable);
				expect(variables).toContain(
					result.transitionObservations.get("trans-2")!.variable,
				);
				expect(variables.length).toBe(initialCount + 2);
			});

			it("réutilise la réceptivité telle quelle quand elle n'est pas temporisée", () => {
				const t = new TransitionBuilder()
					.id("trans-1")
					.expression("E1 = VRAI")
					.build();
				const grafcet = new GrafcetBuilder().addTransition(t).build();

				const result = GrafcetPreCompiler.preCompile(
					grafcet,
					variables,
					Dialect.FR,
					errors,
				);

				expect(result.transitionObservations.get("trans-1")!.node).toBe(
					result.transitions.get("trans-1")!.node,
				);
			});

			it("remplace chaque TimerNode par une lecture de sa variable de sortie", () => {
				const t = new TransitionBuilder()
					.id("trans-1")
					.expression("T1/E1/1s")
					.build();
				const grafcet = new GrafcetBuilder().addTransition(t).build();

				const result = GrafcetPreCompiler.preCompile(
					grafcet,
					variables,
					Dialect.FR,
					errors,
				);

				const timer = result.transitions.get("trans-1")!.timers[0];
				const node = result.transitionObservations.get("trans-1")!.node as {
					type: string;
					value: string;
				};
				expect(node.type).toBe("IDENTIFIER");
				expect(node.value).toBe((timer.output as { value: string }).value);
				expect(errors).toEqual([]);
			});
		});

		it("collects errors from transition compilation", () => {
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("((")
				.build(); // Invalid syntax
			const grafcet = new GrafcetBuilder().addTransition(transition).build();

			GrafcetPreCompiler.preCompile(grafcet, variables, Dialect.FR, errors);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toBeInstanceOf(ProjectPreCompilerError);
			expect(errors[0].source.sourceType).toBe("grafcet-transition");
			expect(errors[0].source.sourceId).toBe("trans-1");
		});

		it("collects errors from action compilation", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const action = new ActionBuilder()
				.id("action-1")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.expression("((") // Invalid syntax
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

			GrafcetPreCompiler.preCompile(grafcet, variables, Dialect.FR, errors);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toBeInstanceOf(ProjectPreCompilerError);
			expect(errors[0].source.sourceType).toBe("grafcet-action");
			expect(errors[0].source.sourceId).toBe("action-1");
		});

		it("works with English dialect", () => {
			const step = new StepBuilder().id("step-1").number(1).build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("TRUE")
				.build();
			const grafcet = new GrafcetBuilder()
				.addStep(step)
				.addTransition(transition)
				.build();

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.EN,
				errors,
			);

			expect(result.transitions.get("trans-1")).toBeDefined();
			expect(errors).toEqual([]);
		});

		it("compiles complex grafcet with all element types", () => {
			const step1 = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(true)
				.build();
			const transition1 = new TransitionBuilder()
				.id("trans-1")
				.expression("E1 = VRAI")
				.build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const action1 = new ActionBuilder()
				.id("action-1")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("M1")
				.build();
			const grafcet = new GrafcetBuilder()
				.addStep(step1)
				.addStep(step2)
				.addTransition(transition1)
				.addAction(action1)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-1", "source:successor")
						.target("transition", "trans-1", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("transition", "trans-1", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.addConnection(
					new ConnectionBuilder()
						.source("step", "step-2", "source:action")
						.target("action", "action-1", "target:step")
						.build(),
				)
				.build();

			const result = GrafcetPreCompiler.preCompile(
				grafcet,
				variables,
				Dialect.FR,
				errors,
			);

			expect(result.steps.size).toBe(2);
			expect(result.stepsMemos.size).toBe(2);
			expect(result.transitions.size).toBe(1);
			expect(result.actions.size).toBe(1);
			expect(errors).toEqual([]);
		});
	});
});
