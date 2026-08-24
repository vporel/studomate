import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import LadderElementAnalyser from "./element.analyser";

export default class BlockAnalyser extends LadderElementAnalyser<BlockElement> {
	analyseIsolated(_element: BlockElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: BlockElement,
		ladder: Ladder,
		_variablesByMnemonic: Map<string, Variable>,
		project: Project,
	): ProjectAnalyserIssue[] {
		const source = { sourceType: "ladder-block", sourceId: element.id, parentId: ladder.id } as const;
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
			.filter((el) => el.type === "block" && el.data.params.programId === programId).length;
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
