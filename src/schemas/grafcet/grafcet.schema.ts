import Action from "./action.schema";
import GrafcetComment from "./comment.schema";
import { GrafcetElementType } from "./grafcet-element.schema";
import JunctionAndEnd from "./junction-and-end.schema";
import JunctionAndStart from "./junction-and-start.schema";
import JunctionOrEnd from "./junction-or-end.schema";
import JunctionOrStart from "./junction-or-start.schema";
import StepReferralSource from "./step-referral-source.schema";
import StepReferralTarget from "./step-referral-target.schema";
import Step from "./step.schema";
import Transition from "./transition.schema";

export type GrafcetFormat = {
	type: "A4" | "A3";
	orientation: "portrait" | "landscape";
};

export default class Grafcet {
	id: string = "";
	format: GrafcetFormat = { type: "A4", orientation: "portrait" };
	steps: Step[] = [];
	actions: Action[] = [];
	transitions: Transition[] = [];
	stepsReferralsSources: StepReferralSource[] = [];
	stepsReferralsTargets: StepReferralTarget[] = [];
	junctionsAndStarts: JunctionAndStart[] = [];
	junctionsAndEnds: JunctionAndEnd[] = [];
	junctionsOrStarts: JunctionOrStart[] = [];
	junctionsOrEnds: JunctionOrEnd[] = [];
	comments: GrafcetComment[] = [];
	links: [] = [];

	constructor(id: string, format: GrafcetFormat) {
		this.id = id;
		this.format = format;
	}

	/**
	 *
	 * @returns The keys are the steps' ids, the values are the ids of the steps and transition(s) necessary to activate the designated step
	 */
	getStepsActivationConditions(): Record<string, string[]> {
		return {};
	}

	validate(): string[] | null {
		return null;
	}

	getElementGroup(type: GrafcetElementType) {
		switch (type) {
			case "step":
				return this.steps;
			case "action":
				return this.actions;
			case "transition":
				return this.transitions;
			case "step-referral-source":
				return this.stepsReferralsSources;
			case "step-referral-target":
				return this.stepsReferralsTargets;
			case "junction-and-start":
				return this.junctionsAndStarts;
			case "junction-and-end":
				return this.junctionsAndEnds;
			case "junction-or-start":
				return this.junctionsOrStarts;
			case "junction-or-end":
				return this.junctionsOrEnds;
			case "comment":
				return this.comments;
		}
	}
}
