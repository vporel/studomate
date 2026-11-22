import { ActionData } from "@/schemas/grafcet/action.schema";
import { CommentData } from "@/schemas/grafcet/comment.schema";
import { ElementType } from "@/schemas/grafcet/element.schema";
import { StepData } from "@/schemas/grafcet/step.schema";
import { StepReferralSourceData } from "@/schemas/grafcet/step-referral-source.schema";
import { StepReferralTargetData } from "@/schemas/grafcet/step-referral-target.schema";
import { TransitionData } from "@/schemas/grafcet/transition.schema";

/** Translator scoped to `grafcetEditor.elements`. */
export type GrafcetElementsTranslator = (
	key: string,
	values?: Record<string, string | number>,
) => string;

/** Translated name of a grafcet element type ("Step", "OR divergence"...). */
export function grafcetElementTypeLabel(
	type: ElementType,
	t: GrafcetElementsTranslator,
): string {
	return t(`types.${type}`);
}

/**
 * Short accessible label of a grafcet node, set as the React Flow node's `ariaLabel` (without it,
 * screen readers announce "Node <id>").
 */
export default function describeGrafcetElement(
	type: ElementType,
	data: unknown,
	t: GrafcetElementsTranslator,
): string {
	switch (type) {
		case "step": {
			const { number, initial } = data as StepData;
			if (number === "") return t("aria.unnumberedStep");
			return t(initial ? "aria.initialStep" : "aria.step", { number });
		}
		case "transition": {
			const expression = (data as TransitionData).expression
				.split("\n")
				.join(" ")
				.trim();
			return expression
				? t("aria.transition", { expression })
				: t("aria.emptyTransition");
		}
		case "action": {
			const expression = (data as ActionData).expression.trim();
			return expression
				? t("aria.action", { expression })
				: t("aria.emptyAction");
		}
		case "comment": {
			const text = (data as CommentData).text.trim();
			return text
				? t("aria.comment", { text })
				: grafcetElementTypeLabel(type, t);
		}
		case "step-referral-source": {
			const number = (data as StepReferralSourceData).targetStepNumber;
			return number === ""
				? t("aria.referralToUnset")
				: t("aria.referralTo", { number });
		}
		case "step-referral-target": {
			const number = (data as StepReferralTargetData).sourceStepNumber;
			return number === ""
				? t("aria.referralFromUnset")
				: t("aria.referralFrom", { number });
		}
		default:
			return grafcetElementTypeLabel(type, t);
	}
}
