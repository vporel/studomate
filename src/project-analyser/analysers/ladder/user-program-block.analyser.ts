import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";

/**
 * Validation propre à un bloc `"user-program"` — voir `UserProgramBlockParams`. Le `programId`
 * référencé doit désigner un programme existant, de type ladder, qui n'est pas le Main ; un même
 * programme référencé par plusieurs blocs du Main déclenche un avertissement. Appelé par
 * `BlockAnalyser`, qui dispatche par `blockType`.
 */
export default class UserProgramBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		ladder: Ladder,
		project: Project,
	): ProjectAnalyserIssue[] {
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
