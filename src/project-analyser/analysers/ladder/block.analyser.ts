import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import ArithmeticBlockAnalyser from "./arithmetic-block.analyser";
import AssignBlockAnalyser from "./assign-block.analyser";
import CompareBlockAnalyser from "./compare-block.analyser";
import CounterBlockAnalyser from "./counter-block.analyser";
import LadderElementAnalyser from "./element.analyser";
import TimerBlockAnalyser from "./timer-block.analyser";

export default class BlockAnalyser extends LadderElementAnalyser<BlockElement> {
	analyseIsolated(_element: BlockElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: BlockElement,
		ladder: Ladder,
		variablesByMnemonic: Map<string, Variable>,
		project: Project,
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "ladder-block",
			sourceId: element.id,
			parentId: ladder.id,
		} as const;
		if (element.data.blockType === "timer") {
			return TimerBlockAnalyser.analyse(element, source, variablesByMnemonic);
		}
		if (element.data.blockType === "counter") {
			return CounterBlockAnalyser.analyse(element, source, variablesByMnemonic);
		}
		if (element.data.blockType === "compare") {
			return CompareBlockAnalyser.analyse(
				element,
				source,
				project.dialect,
				variablesByMnemonic,
			);
		}
		if (element.data.blockType === "assign") {
			return AssignBlockAnalyser.analyse(
				element,
				source,
				project.dialect,
				variablesByMnemonic,
			);
		}
		if (element.data.blockType === "arithmetic") {
			return ArithmeticBlockAnalyser.analyse(
				element,
				source,
				project.dialect,
				variablesByMnemonic,
			);
		}
		if (element.data.blockType !== "user-program") return [];
		const { programId } = element.data.params;
		const issues: ProjectAnalyserIssue[] = [];

		const referenced = project.getProgram(programId);
		if (!referenced) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_PROGRAM_UNDECLARED",
					source,
					"Le programme référencé par ce bloc n'existe pas dans le projet.",
				),
			);
			return issues;
		}
		if (referenced.type !== "ladder") {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_PROGRAM_NOT_LADDER",
					source,
					`Le programme "${referenced.name}" référencé par ce bloc n'est pas un ladder.`,
				),
			);
			return issues;
		}
		if ((referenced as Ladder).role === "main") {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_PROGRAM_IS_MAIN",
					source,
					`Le programme "${referenced.name}" est le Main du projet : il ne peut pas être appelé par un bloc.`,
				),
			);
		}

		const duplicateCount = ladder
			.getAllElements()
			.filter(
				(el) =>
					el.type === "block" &&
					el.data.blockType === "user-program" &&
					el.data.params.programId === programId,
			).length;
		if (duplicateCount > 1) {
			issues.push(
				new ProjectAnalyserIssue(
					"warning",
					"BLOCK_PROGRAM_DUPLICATE_REFERENCE",
					source,
					`Le programme "${referenced.name}" est référencé par plusieurs blocs de ce Main.`,
				),
			);
		}

		return issues;
	}
}
