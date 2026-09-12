import {
	ElementType,
	GRAFCET_ELEMENT_LABELS,
} from "@/schemas/grafcet/element.schema";
import { ActionData } from "@/schemas/grafcet/action.schema";
import { CommentData } from "@/schemas/grafcet/comment.schema";
import { StepData } from "@/schemas/grafcet/step.schema";
import { StepReferralSourceData } from "@/schemas/grafcet/step-referral-source.schema";
import { StepReferralTargetData } from "@/schemas/grafcet/step-referral-target.schema";
import { TransitionData } from "@/schemas/grafcet/transition.schema";

/** Libellé accessible court d'un nœud du grafcet, posé en `ariaLabel` sur le nœud React Flow
 * (sans quoi le lecteur d'écran annonce « Node <identifiant> »). */
export default function describeGrafcetElement(
	type: ElementType,
	data: unknown,
): string {
	switch (type) {
		case "step": {
			const { number, initial } = data as StepData;
			const base = initial ? "Étape initiale" : "Étape";
			return number === "" ? "Étape (non numérotée)" : `${base} ${number}`;
		}
		case "transition": {
			const expression = (data as TransitionData).expression
				.split("\n")
				.join(" ")
				.trim();
			return expression ? `Transition : ${expression}` : "Transition (vide)";
		}
		case "action": {
			const expression = (data as ActionData).expression.trim();
			return expression ? `Action : ${expression}` : "Action (vide)";
		}
		case "comment": {
			const text = (data as CommentData).text.trim();
			return text ? `Commentaire : ${text}` : "Commentaire";
		}
		case "step-referral-source": {
			const target = (data as StepReferralSourceData).targetStepNumber;
			return target === ""
				? "Renvoi vers une étape"
				: `Renvoi vers l'étape ${target}`;
		}
		case "step-referral-target": {
			const source = (data as StepReferralTargetData).sourceStepNumber;
			return source === ""
				? "Renvoi depuis une étape"
				: `Renvoi depuis l'étape ${source}`;
		}
		default:
			return GRAFCET_ELEMENT_LABELS[type];
	}
}
