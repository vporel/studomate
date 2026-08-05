import { LadderElement, LadderElementKind } from "@/schemas/ladder/element.schema";
import CoilAnalyser from "./coil.analyser";
import ContactAnalyser from "./contact.analyser";
import LadderElementAnalyser from "./element.analyser";

export default class LadderElementAnalyserFactory {
	static getAnalyser(
		elementKind: LadderElementKind,
	): LadderElementAnalyser<LadderElement> | null {
		switch (elementKind) {
			case "contact":
				return new ContactAnalyser() as LadderElementAnalyser<LadderElement>;
			case "coil":
				return new CoilAnalyser() as LadderElementAnalyser<LadderElement>;
			case "railTerminal":
				return null;
		}
	}
}
