import { GrafcetNodeType } from "@/components/grafcet/flow/grafcet-nodes-definitions";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetElement, { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";

export default class NodesFactory {
	static getInitialNodes(grafcet: Grafcet): GrafcetNodeType[] {
		const elementsByType: Record<string, GrafcetElement<any>[]> = {
			step: grafcet.steps,
			action: grafcet.actions,
			transition: grafcet.transitions,
			"step-referral-source": grafcet.stepsReferralsSources,
			"step-referral-target": grafcet.stepsReferralsTargets,
			"junction-and-start": grafcet.junctionsAndStarts,
			"junction-and-end": grafcet.junctionsAndEnds,
			"junction-or-start": grafcet.junctionsOrStarts,
			"junction-or-end": grafcet.junctionsOrEnds,
			comment: grafcet.comments,
		};
		const nodes: GrafcetNodeType[] = [];
		(Object.keys(elementsByType) as GrafcetElementType[]).forEach((type) => {
			const elements = elementsByType[type];
			elements.forEach((element) => {
				nodes.push({
					id: element.id,
					type,
					data: element.data,
					position: element.position,
				} as GrafcetNodeType);
			});
		});
		return nodes;
	}
}
