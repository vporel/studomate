import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement, BlockType } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import ArithmeticBlockAnalyser from "./arithmetic-block.analyser";
import AssignBlockAnalyser from "./assign-block.analyser";
import CompareBlockAnalyser from "./compare-block.analyser";
import CounterBlockAnalyser from "./counter-block.analyser";
import LadderElementAnalyser, {
	LadderVariablesContext,
} from "./element.analyser";
import TimerBlockAnalyser from "./timer-block.analyser";
import UserProgramBlockAnalyser from "./user-program-block.analyser";

type BlockAnalysisContext = {
	source: ProjectAnalyserIssueSource;
	ladder: Ladder;
	variablesByMnemonic: Map<string, Variable>;
	environment: Environment;
	project: Project;
};

/**
 * Une entrée par famille de bloc — délègue à l'analyser dédié de la famille (règles métier
 * propres, jamais fusionnées ici). `Record<BlockType, …>` casse le build tant qu'une famille
 * manque.
 */
const BLOCK_ANALYSERS: Record<
	BlockType,
	(element: BlockElement, ctx: BlockAnalysisContext) => ProjectAnalyserIssue[]
> = {
	timer: (element, ctx) =>
		TimerBlockAnalyser.analyse(element, ctx.source, ctx.variablesByMnemonic),
	counter: (element, ctx) =>
		CounterBlockAnalyser.analyse(
			element,
			ctx.source,
			ctx.project.dialect,
			ctx.variablesByMnemonic,
		),
	compare: (element, ctx) =>
		CompareBlockAnalyser.analyse(
			element,
			ctx.source,
			ctx.project.dialect,
			ctx.environment,
		),
	assign: (element, ctx) =>
		AssignBlockAnalyser.analyse(
			element,
			ctx.source,
			ctx.project.dialect,
			ctx.environment,
		),
	arithmetic: (element, ctx) =>
		ArithmeticBlockAnalyser.analyse(
			element,
			ctx.source,
			ctx.project.dialect,
			ctx.environment,
		),
	"user-program": (element, ctx) =>
		UserProgramBlockAnalyser.analyse(
			element,
			ctx.source,
			ctx.ladder,
			ctx.project,
		),
};

export default class BlockAnalyser extends LadderElementAnalyser<BlockElement> {
	analyseIsolated(_element: BlockElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: BlockElement,
		ladder: Ladder,
		{ variablesByMnemonic, environment }: LadderVariablesContext,
		project: Project,
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "ladder-block",
			sourceId: element.id,
			parentId: ladder.id,
		} as const;
		const issues = BLOCK_ANALYSERS[element.data.blockType](element, {
			source,
			ladder,
			variablesByMnemonic,
			environment,
			project,
		});

		const hasPredecessor = ladder
			.getAllConnections()
			.some(({ connection }) => connection.target.id === element.id);
		if (!hasPredecessor) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"LADDER_ELEMENT_NO_PREDECESSOR",
					source,
				),
			);
		}

		return issues;
	}
}
