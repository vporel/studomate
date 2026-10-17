import type { BytecodeImage } from "@/bytecode/bytecode.generator";
import ProjectAnalyser from "@/project-analyser/project.analyser";
import type { CompiledProject } from "@/project-compiler/project.compiler";
import type Project from "@/schemas/project/project.schema";
import type HardwareLinkContext from "./hardware-link.context";
import type { ResolvedHardwarePlan } from "./hardware-link.context";
import buildProgram, { type ProgramBuildResult } from "./program-builder";

export type PrepareFailure =
	"analysis" | Extract<ProgramBuildResult, { kind: "failed" }>["failure"];

export interface PreparedBoardProgram {
	image: BytecodeImage;
	compiled: CompiledProject;
}

/**
 * Analyses and compiles the project into the program of the board. Reports a failure through
 * `onFailed` and a program that does not fit through the notifier; both return `null`.
 */
export default function prepareBoardProgram(
	context: HardwareLinkContext,
	project: Project,
	resolved: ResolvedHardwarePlan,
	options: {
		/**
		 * True publishes the issues in the analysis panel; false compares the program without
		 * opening the analysis panel.
		 */
		publishAnalysis: boolean;
		onFailed: (failure: PrepareFailure) => void;
	},
): PreparedBoardProgram | null {
	const state = context.getStoreState();
	let analysis;
	if (options.publishAnalysis) {
		const { ok, projectAnalysisResult } =
			state.simulationManager.analyze(false);
		if (!ok || !projectAnalysisResult) {
			options.onFailed("analysis");
			return null;
		}
		analysis = projectAnalysisResult;
	} else {
		analysis = ProjectAnalyser.analyse(project);
		if (analysis.issues.some((issue) => issue.severity === "error")) {
			options.onFailed("analysis");
			return null;
		}
	}
	const built = buildProgram({
		project,
		analysis,
		ioBindings: context.ioBindings(resolved.plan),
		limits: resolved.descriptor.limits,
		cyclePeriodMs: state.plcConfig.scanTimeMs,
	});
	if (built.kind === "failed") {
		options.onFailed(built.failure);
		return null;
	}
	if (built.kind === "blocked") {
		context.notifier.programBlocked(built.issues);
		return null;
	}
	return { image: built.image, compiled: built.compiled };
}
