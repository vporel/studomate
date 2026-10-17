import arduinoUnoR3 from "@/hardware/arduino/uno-r3.descriptor";
import ProjectAnalyser from "@/project-analyser/project.analyser";
import type Project from "@/schemas/project/project.schema";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import type HardwareLinkContext from "./hardware-link.context";
import type { ResolvedHardwarePlan } from "./hardware-link.context";
import prepareBoardProgram from "./prepare-board-program";
import * as programBuilder from "./program-builder";

function setup() {
	VariableFactory.reset();
	const project: Project = ProjectFactory.create(
		[VariableFactory.createLogicOutput("LAMPE", "lampe")],
		[],
	);
	const analysis = ProjectAnalyser.analyse(project);
	const analyze = jest.fn(() => ({
		ok: true,
		projectAnalysisResult: analysis,
	}));
	const notifier = { programBlocked: jest.fn() };
	const context = {
		notifier,
		getStoreState: () => ({
			simulationManager: { analyze },
			plcConfig: { scanTimeMs: 50 },
		}),
		ioBindings: jest.fn(() => []),
	} as unknown as HardwareLinkContext;
	const resolved = {
		plan: {},
		descriptor: arduinoUnoR3,
	} as unknown as ResolvedHardwarePlan;
	const onFailed = jest.fn();
	return { project, analysis, analyze, notifier, context, resolved, onFailed };
}

describe("prepareBoardProgram", () => {
	afterEach(() => jest.restoreAllMocks());

	it("fails on analysis when the published analysis is not ok", () => {
		const s = setup();
		s.analyze.mockReturnValue({ ok: false, projectAnalysisResult: s.analysis });
		const build = jest.spyOn(programBuilder, "default");
		const result = prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: true,
			onFailed: s.onFailed,
		});
		expect(result).toBeNull();
		expect(s.onFailed).toHaveBeenCalledWith("analysis");
		expect(build).not.toHaveBeenCalled();
	});

	it("fails on analysis when the pure analysis reports an error", () => {
		const s = setup();
		jest.spyOn(ProjectAnalyser, "analyse").mockReturnValue({
			...s.analysis,
			issues: [{ severity: "error" } as never],
		});
		const result = prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: false,
			onFailed: s.onFailed,
		});
		expect(result).toBeNull();
		expect(s.onFailed).toHaveBeenCalledWith("analysis");
	});

	it("publishes the analysis only when asked", () => {
		const s = setup();
		const analyse = jest.spyOn(ProjectAnalyser, "analyse");
		prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: true,
			onFailed: s.onFailed,
		});
		expect(s.analyze).toHaveBeenCalledWith(false);
		expect(analyse).not.toHaveBeenCalled();

		s.analyze.mockClear();
		prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: false,
			onFailed: s.onFailed,
		});
		expect(s.analyze).not.toHaveBeenCalled();
		expect(analyse).toHaveBeenCalledWith(s.project);
	});

	it("reports a failed build through onFailed", () => {
		const s = setup();
		jest
			.spyOn(programBuilder, "default")
			.mockReturnValue({ kind: "failed", failure: "compilation" });
		const result = prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: true,
			onFailed: s.onFailed,
		});
		expect(result).toBeNull();
		expect(s.onFailed).toHaveBeenCalledWith("compilation");
		expect(s.notifier.programBlocked).not.toHaveBeenCalled();
	});

	it("reports a blocked build through the notifier only", () => {
		const s = setup();
		const issues = [{ code: "IMAGE_TOO_LARGE" } as never];
		jest
			.spyOn(programBuilder, "default")
			.mockReturnValue({ kind: "blocked", issues });
		const result = prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: false,
			onFailed: s.onFailed,
		});
		expect(result).toBeNull();
		expect(s.notifier.programBlocked).toHaveBeenCalledWith(issues);
		expect(s.onFailed).not.toHaveBeenCalled();
	});

	it("returns the image and the compiled project of a built program", () => {
		const s = setup();
		const image = { imageId: 1 } as never;
		const compiled = { routines: [] } as never;
		const build = jest
			.spyOn(programBuilder, "default")
			.mockReturnValue({ kind: "built", image, compiled });
		const result = prepareBoardProgram(s.context, s.project, s.resolved, {
			publishAnalysis: true,
			onFailed: s.onFailed,
		});
		expect(result).toEqual({ image, compiled });
		expect(build).toHaveBeenCalledWith(
			expect.objectContaining({
				project: s.project,
				analysis: s.analysis,
				cyclePeriodMs: 50,
				limits: arduinoUnoR3.limits,
			}),
		);
		expect(s.onFailed).not.toHaveBeenCalled();
	});
});
