import JunctionAndStart from "@/schemas/grafcet/junction-and-start.schema";
import AbstractJunctionAndAnalyser, {
	AndJunctionAnalyserConfig,
} from "./abstract-junction-and.analyser";

export default class JunctionAndStartAnalyser extends AbstractJunctionAndAnalyser<JunctionAndStart> {
	protected readonly config: AndJunctionAnalyserConfig = {
		sourceType: "grafcet-junction-and-start",
		direction: "forward",
		sameKindCollection: "junctionsAndStarts",
		oppositeCollection: "junctionsAndEnds",
		unmatchedCode: "JUNCTION_AND_DIVERGENCE_NOT_CLOSED",
	};
}
