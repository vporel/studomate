import Action from "@/schemas/grafcet/action.schema";
import Comment from "@/schemas/grafcet/comment.schema";
import {
	ElementConstructor,
	ElementType,
} from "@/schemas/grafcet/element.schema";
import JunctionAndEnd from "@/schemas/grafcet/junction-and-end.schema";
import JunctionAndStart from "@/schemas/grafcet/junction-and-start.schema";
import JunctionOrEnd from "@/schemas/grafcet/junction-or-end.schema";
import JunctionOrStart from "@/schemas/grafcet/junction-or-start.schema";
import StepReferralSource from "@/schemas/grafcet/step-referral-source.schema";
import StepReferralTarget from "@/schemas/grafcet/step-referral-target.schema";
import Step from "@/schemas/grafcet/step.schema";
import Transition from "@/schemas/grafcet/transition.schema";

export const GRAFCET_ELEMENT_CLASSES: Record<
	ElementType,
	ElementConstructor<any>
> = {
	step: Step,
	action: Action,
	transition: Transition,
	"step-referral-source": StepReferralSource,
	"step-referral-target": StepReferralTarget,
	"junction-or-start": JunctionOrStart,
	"junction-or-end": JunctionOrEnd,
	"junction-and-start": JunctionAndStart,
	"junction-and-end": JunctionAndEnd,
	comment: Comment,
};
