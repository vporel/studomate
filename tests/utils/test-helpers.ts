import ProjectAnalyser from "@/project-analyser/project.analyser";
import ProjectCompiler, { CompiledProject } from "@/project-compiler/project.compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import Project from "@/schemas/project/project.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import PLC from "@/simulator/core/plc/plc";

/**
 * Helper functions for integration tests
 */

/**
 * Runs the complete pipeline: Analysis → Pre-compilation → Compilation
 * @param project Project to compile
 * @param dialect Dialect for expressions (default FR)
 * @returns Compiled project or null if errors occurred
 */
export function compileProject(project: Project, dialect: Dialect = Dialect.FR): CompiledProject | null {
	const analysisResult = ProjectAnalyser.analyse(project);
	if (analysisResult.issues.length > 0) {
		return null;
	}

	const preCompilationResult = ProjectPreCompiler.preCompile(
		project,
		analysisResult.stepsVariables,
		dialect,
	);
	if (preCompilationResult.errors.length > 0 || !preCompilationResult.result) {
		return null;
	}

	const compilationResult = ProjectCompiler.compile(preCompilationResult.result);
	if (compilationResult.errors.length > 0 || !compilationResult.result) {
		return null;
	}

	return compilationResult.result;
}

/**
 * Runs the complete pipeline and returns all intermediate results
 */
export function compilePipelineDetailed(project: Project, dialect: Dialect = Dialect.FR) {
	const analysisResult = ProjectAnalyser.analyse(project);
	const preCompilationResult = ProjectPreCompiler.preCompile(
		project,
		analysisResult.stepsVariables,
		dialect,
	);
	const compilationResult = preCompilationResult.result
		? ProjectCompiler.compile(preCompilationResult.result)
		: { errors: [], result: undefined };

	return {
		analysis: analysisResult,
		preCompilation: preCompilationResult,
		compilation: compilationResult,
	};
}

/**
 * Creates a PLC from a compiled project
 * @param compiled Compiled project
 * @param scanTimeMs Scan time in milliseconds (default 100)
 * @param callbacks Optional PLC lifecycle callbacks
 * @returns PLC instance
 */
export function createPLC(
	compiled: CompiledProject,
	scanTimeMs: number = 100,
	callbacks?: {
		onCycleEnd?: (plc: PLC) => void;
		onCycleError?: (error: Error) => void;
	},
): PLC {
	return new PLC({
		scanTimeMs,
		program: compiled.routines,
		routinesById: compiled.routinesById,
		variables: compiled.variables,
		onCycleEnd: callbacks?.onCycleEnd,
		onCycleError: callbacks?.onCycleError,
	});
}

/**
 * Compiles a project and creates a PLC
 */
export function compileToPLC(
	project: Project,
	scanTimeMs: number = 100,
	dialect: Dialect = Dialect.FR,
	callbacks?: {
		onCycleEnd?: (plc: PLC) => void;
		onCycleError?: (error: Error) => void;
	},
): PLC | null {
	const compiled = compileProject(project, dialect);
	if (!compiled) {
		return null;
	}
	return createPLC(compiled, scanTimeMs, callbacks);
}

/**
 * Gets a variable value by mnemonic from PLC snapshot
 */
export function getVariableValue(plc: PLC, mnemonic: string): any {
	const snapshot = plc.getVariablesSnapshot();
	const variable = snapshot.find((v) => v.getName() === mnemonic);
	return variable?.getValue();
}

/**
 * Asserts that a variable has the expected value
 */
export function expectVariableValue(plc: PLC, mnemonic: string, expectedValue: any): void {
	const value = getVariableValue(plc, mnemonic);
	expect(value).toBe(expectedValue);
}
