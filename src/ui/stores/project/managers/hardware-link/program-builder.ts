import checkAdmissibility from "@/bytecode/bytecode.admissibility";
import BytecodeGenerationError from "@/bytecode/bytecode.error";
import generateBytecode, {
	type BytecodeImage,
	type IoBinding,
} from "@/bytecode/bytecode.generator";
import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";
import type { ProjectAnalysisResult } from "@/project-analyser/project.analyser";
import ProjectCompiler from "@/project-compiler/project.compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import type Project from "@/schemas/project/project.schema";
import type { ProgramBlockingIssue } from "./hardware-link.notifier";

export type ProgramBuildResult =
	| { kind: "built"; image: BytecodeImage }
	/** The project does not compile, or uses something the board cannot run. */
	| { kind: "failed"; failure: "compilation" | "unsupported" }
	/** The program does not fit the board. */
	| { kind: "blocked"; issues: ProgramBlockingIssue[] };

/**
 * Compiles an analysed project into the program image of a board and checks that the board can
 * hold it. Does not touch the store or the board.
 */
export default function buildProgram(input: {
	project: Project;
	analysis: ProjectAnalysisResult;
	/** Variables wired to the pins of the board. */
	ioBindings: IoBinding[];
	limits: HardwareDeviceDescriptor["limits"];
	cyclePeriodMs: number;
}): ProgramBuildResult {
	const { project, analysis, ioBindings, limits, cyclePeriodMs } = input;

	const preCompiled = ProjectPreCompiler.preCompile(
		project,
		analysis.generatedVariables,
		project.dialect,
	);
	if (preCompiled.errors.length > 0 || !preCompiled.result) {
		return { kind: "failed", failure: "compilation" };
	}
	const compilation = ProjectCompiler.compile(preCompiled.result);
	if (compilation.errors.length > 0 || !compilation.result) {
		return { kind: "failed", failure: "compilation" };
	}

	let image: BytecodeImage;
	try {
		image = generateBytecode({
			compiled: compilation.result,
			ioBindings,
			cyclePeriodMs,
		});
	} catch (error) {
		if (!(error instanceof BytecodeGenerationError)) throw error;
		console.error("Bytecode generation failed:", error);
		return { kind: "failed", failure: "unsupported" };
	}

	const report = checkAdmissibility(image, limits);
	if (!report.admissible) {
		return {
			kind: "blocked",
			issues: report.issues.map((issue): ProgramBlockingIssue => {
				const programId =
					issue.code === "IMAGE_TOO_LARGE"
						? issue.heaviestRoutine?.programId
						: null;
				return programId
					? { ...issue, programName: project.programs[programId]?.name }
					: issue;
			}),
		};
	}
	return { kind: "built", image };
}
