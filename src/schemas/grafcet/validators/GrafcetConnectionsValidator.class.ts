import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import Grafcet from "../Grafcet.class";

export default class GrafcetConnectionsValidator {
	static validateConnection(
		connection: {
			sourceId: string;
			targetId: string;
			sourceHandleId: string;
			targetHandleId: string;
		},
		grafcet: Grafcet,
	): boolean {
		const sourceType = grafcet.getElementById(connection.sourceId)!.type as GrafcetElementType;
		const targetType = grafcet.getElementById(connection.targetId)!.type as GrafcetElementType;
		const targetElementConnections = grafcet.getConnectionsByElementIdAndHandleId(
			connection.targetId,
			connection.targetHandleId,
		);

		if (
			sourceType == "step" &&
			!["transition", "action", "junction-or-start", "junction-and-end"].includes(targetType)
		)
			return false;
		if (sourceType == "transition") {
			if (targetType == "step") {
				return targetElementConnections.length == 0; //A step can only have one incoming transition other possibilities are from junctions
			} else if (
				!["junction-and-start", "junction-or-end", "step-referral-source"].includes(targetType)
			)
				return false;
		}
		if (sourceType == "junction-or-start" && !["transition"].includes(targetType)) return false;
		if (sourceType == "junction-or-end" && !["step"].includes(targetType)) return false;
		if (sourceType == "junction-and-start" && !["step"].includes(targetType)) return false;
		if (sourceType == "junction-and-end" && !["transition"].includes(targetType)) return false;
		if (sourceType == "step-referral-target" && !["step"].includes(targetType)) return false;
		return true;
	}
}
