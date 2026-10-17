import JunctionAndEnd from "@/schemas/grafcet/junction-and-end.schema";
import AbstractJunctionAndAnalyser, {
	AndJunctionAnalyserConfig,
} from "./abstract-junction-and.analyser";

export default class JunctionAndEndAnalyser extends AbstractJunctionAndAnalyser<JunctionAndEnd> {
	protected readonly config: AndJunctionAnalyserConfig = {
		sourceType: "grafcet-junction-and-end",
		direction: "backward",
		sameKindCollection: "junctionsAndEnds",
		oppositeCollection: "junctionsAndStarts",
		unmatchedCode: "JUNCTION_AND_CONVERGENCE_WITHOUT_DIVERGENCE",
	};
}
