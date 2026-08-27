import { ElementType } from "@/schemas/grafcet/element.schema";
import ActionAnalyser from "./action.analyser";
import DefaultElementAnalyser from "./default-element.analyser";
import GrafcetElementAnalyser from "./element.analyser";
import JunctionAndEndAnalyser from "./junction-and-end.analyser";
import JunctionAndStartAnalyser from "./junction-and-start.analyser";
import JunctionOrEndAnalyser from "./junction-or-end.analyser";
import JunctionOrStartAnalyser from "./junction-or-start.analyser";
import StepReferralSourceAnalyser from "./step-referral-source.analyser";
import StepReferralTargetAnalyser from "./step-referral-target.analyser";
import StepAnalyser from "./step.analyser";
import TransitionAnalyser from "./transition.analyser";

export default class GrafcetElementAnalyserFactory {
	private static readonly ANALYSERS: Record<
		ElementType,
		GrafcetElementAnalyser<any>
	> = {
		action: new ActionAnalyser(),
		comment: new DefaultElementAnalyser("comment"),
		"junction-and-end": new JunctionAndEndAnalyser(),
		"junction-and-start": new JunctionAndStartAnalyser(),
		"junction-or-end": new JunctionOrEndAnalyser(),
		"junction-or-start": new JunctionOrStartAnalyser(),
		step: new StepAnalyser(),
		"step-referral-source": new StepReferralSourceAnalyser(),
		"step-referral-target": new StepReferralTargetAnalyser(),
		transition: new TransitionAnalyser(),
	};

	static getAnalyser(
		elementType: ElementType,
	): GrafcetElementAnalyser<any> | null {
		return this.ANALYSERS[elementType] ?? null;
	}
}
