import { ElementType } from "@/schemas/grafcet/element.schema";
import ActionAnalyser from "./action.analyser";
import DefaultElementAnalyser from "./default-element.analyser";
import ElementAnalyser from "./element.analyser";
import StepReferralSourceAnalyser from "./step-referral-source.analyser";
import StepReferralTargetAnalyser from "./step-referral-target.analyser";
import StepAnalyser from "./step.analyser";
import TransitionAnalyser from "./transition.analyser";

export default class ElementAnalyserFactory {
	private static ANALYSERS: Record<ElementType, ElementAnalyser<any>> = {
		action: new ActionAnalyser(),
		comment: new DefaultElementAnalyser("comment"),
		"junction-and-end": new DefaultElementAnalyser("junction-and-end"),
		"junction-and-start": new DefaultElementAnalyser("junction-and-start"),
		"junction-or-end": new DefaultElementAnalyser("junction-or-end"),
		"junction-or-start": new DefaultElementAnalyser("junction-or-start"),
		step: new StepAnalyser(),
		"step-referral-source": new StepReferralSourceAnalyser(),
		"step-referral-target": new StepReferralTargetAnalyser(),
		transition: new TransitionAnalyser(),
	};

	static getAnalyserForType(elementType: ElementType): ElementAnalyser<any> {
		const analyser = this.ANALYSERS[elementType as ElementType];
		if (!analyser) {
			throw new Error(`No analyser found for element type ${elementType}`);
		}
		return analyser;
	}
}
