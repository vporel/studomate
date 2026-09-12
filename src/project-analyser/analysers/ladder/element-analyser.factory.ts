import {
	LadderElement,
	LadderElementKind,
} from "@/schemas/ladder/element.schema";
import BlockAnalyser from "./block.analyser";
import CoilAnalyser from "./coil.analyser";
import ContactAnalyser from "./contact.analyser";
import LadderElementAnalyser from "./element.analyser";

export default class LadderElementAnalyserFactory {
	private static readonly ANALYSERS: Record<
		LadderElementKind,
		LadderElementAnalyser<LadderElement> | null
	> = {
		contact: new ContactAnalyser() as LadderElementAnalyser<LadderElement>,
		coil: new CoilAnalyser() as LadderElementAnalyser<LadderElement>,
		block: new BlockAnalyser() as LadderElementAnalyser<LadderElement>,
		railTerminal: null,
	};

	static getAnalyser(
		elementKind: LadderElementKind,
	): LadderElementAnalyser<LadderElement> | null {
		return this.ANALYSERS[elementKind] ?? null;
	}
}
