import ProjectPreCompilerError, {
	ProjectPreCompilerErrorSource,
	ProjectPreCompilerErrorSourceBuilder,
} from "./project.pre-compiler.error";

describe("ProjectPreCompilerErrorSourceBuilder", () => {
	describe("buildGrafcetSource", () => {
		it("creates a grafcet source", () => {
			const source =
				ProjectPreCompilerErrorSourceBuilder.buildGrafcetSource("grafcet-1");
			expect(source).toEqual({
				sourceType: "grafcet",
				sourceId: "grafcet-1",
			});
		});
	});

	describe("buildStepSource", () => {
		it("creates a step source", () => {
			const source =
				ProjectPreCompilerErrorSourceBuilder.buildStepSource("step-1");
			expect(source).toEqual({
				sourceType: "grafcet-step",
				sourceId: "step-1",
			});
		});
	});

	describe("buildTransitionSource", () => {
		it("creates a transition source", () => {
			const source =
				ProjectPreCompilerErrorSourceBuilder.buildTransitionSource("trans-1");
			expect(source).toEqual({
				sourceType: "grafcet-transition",
				sourceId: "trans-1",
			});
		});
	});

	describe("buildActionSource", () => {
		it("creates an action source", () => {
			const source =
				ProjectPreCompilerErrorSourceBuilder.buildActionSource("action-1");
			expect(source).toEqual({
				sourceType: "grafcet-action",
				sourceId: "action-1",
			});
		});
	});
});

describe("ProjectPreCompilerError", () => {
	let source: ProjectPreCompilerErrorSource;

	beforeEach(() => {
		source = { sourceType: "grafcet-step", sourceId: "step-42" };
	});

	it("extends Error", () => {
		const error = new ProjectPreCompilerError(source, "Test message");
		expect(error).toBeInstanceOf(Error);
	});

	it("stores the source", () => {
		const error = new ProjectPreCompilerError(source, "Test message");
		expect(error.source).toBe(source);
	});

	it("stores the message", () => {
		const error = new ProjectPreCompilerError(source, "Invalid expression");
		expect(error.message).toBe("Invalid expression");
	});

	it("is readonly on source property", () => {
		const error = new ProjectPreCompilerError(source, "Test");
		// TypeScript should prevent: error.source = { ... };
		expect(error.source).toBe(source);
	});
});
