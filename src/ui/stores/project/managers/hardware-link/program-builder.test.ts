import { Dialect } from "@/expression-language/dialect.enum";
import * as generator from "@/bytecode/bytecode.generator";
import BytecodeGenerationError from "@/bytecode/bytecode.error";
import arduinoUnoR3 from "@/hardware/arduino/uno-r3.descriptor";
import { IO_ROLE } from "@/bytecode/bytecode-format";
import type { IoBinding } from "@/bytecode/bytecode.generator";
import ProjectAnalyser from "@/project-analyser/project.analyser";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import type Project from "@/schemas/project/project.schema";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import buildProgram from "./program-builder";

function setup(withGrafcet = false) {
	VariableFactory.reset();
	const button = VariableFactory.createLogicInput("BP", "bp").update(
		{
			address: "%PD2",
		},
		Dialect.FR,
	);
	const lamp = VariableFactory.createLogicOutput("LAMPE", "lampe").update(
		{
			address: "%PD13",
		},
		Dialect.FR,
	);
	const grafcets = withGrafcet
		? [GrafcetFactory.createSimpleCycle("g1", "BP", "NON BP")]
		: [];
	const project: Project = ProjectFactory.create([button, lamp], grafcets);
	project.hardwareTarget = { modelId: "arduino-uno-r3" };
	return {
		project,
		analysis: ProjectAnalyser.analyse(project),
		ioBindings: [
			{
				variableId: "bp",
				role: IO_ROLE.DIGITAL_INPUT_PULLUP,
				pin: 2,
				inverted: true,
			},
			{ variableId: "lampe", role: IO_ROLE.DIGITAL_OUTPUT, pin: 13 },
		] satisfies IoBinding[],
		limits: arduinoUnoR3.limits,
		cyclePeriodMs: 100,
	};
}

describe("buildProgram", () => {
	afterEach(() => jest.restoreAllMocks());

	it("builds the image of a project that fits the board", () => {
		const result = buildProgram(setup());
		expect(result.kind).toBe("built");
		if (result.kind !== "built") return;
		expect(result.image.layout.ioCount).toBe(2);
		expect(result.image.layout.cyclePeriodMs).toBe(100);
	});

	it("reports a project that does not pre-compile", () => {
		jest.spyOn(ProjectPreCompiler, "preCompile").mockReturnValue({
			errors: [{} as never],
		});
		expect(buildProgram(setup())).toEqual({
			kind: "failed",
			failure: "compilation",
		});
	});

	it("reports something the bytecode format cannot express as unsupported", () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		jest.spyOn(generator, "default").mockImplementation(() => {
			throw new BytecodeGenerationError("REAL");
		});
		expect(buildProgram(setup())).toEqual({
			kind: "failed",
			failure: "unsupported",
		});
	});

	it("lets any other error of the generator through", () => {
		jest.spyOn(generator, "default").mockImplementation(() => {
			throw new TypeError("bug");
		});
		expect(() => buildProgram(setup())).toThrow(TypeError);
	});

	it("blocks a program that does not fit and names the largest program", () => {
		const input = setup(true);
		const result = buildProgram({
			...input,
			limits: { ...input.limits, programStorageBytes: 10 },
		});
		expect(result.kind).toBe("blocked");
		if (result.kind !== "blocked") return;
		expect(result.issues).toEqual([
			expect.objectContaining({
				code: "IMAGE_TOO_LARGE",
				limitBytes: 10,
				programName: input.project.programs["g1"].name,
			}),
		]);
	});

	it("names the Main program when it is the only one to blame", () => {
		const input = setup();
		const result = buildProgram({
			...input,
			limits: { ...input.limits, programStorageBytes: 10 },
		});
		expect(result.kind).toBe("blocked");
		if (result.kind !== "blocked") return;
		expect(result.issues[0]).toMatchObject({
			code: "IMAGE_TOO_LARGE",
			programName: "Main",
		});
	});
});
