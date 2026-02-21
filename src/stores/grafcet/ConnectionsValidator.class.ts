import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { Connection, ReactFlowInstance } from "@xyflow/react";

export default class ConnectionsValidator {
	static validateConnection(rfInstance: ReactFlowInstance, connection: Connection): boolean {
		const nodes = rfInstance.getNodes();
		const sourceType = nodes.find((n) => n.id == connection.source)!.type as GrafcetElementType;
		const targetType = nodes.find((n) => n.id == connection.target)!.type as GrafcetElementType;
		const targetNodeConnections = rfInstance.getNodeConnections({
			nodeId: connection.target,
			handleId: connection.targetHandle,
			type: "target",
		});

		if (
			sourceType == "step" &&
			!["transition", "action", "junction-or-start", "junction-and-end"].includes(targetType)
		)
			return false;
		if (sourceType == "transition") {
			if (targetType == "step") {
				return targetNodeConnections.length == 0; //A step can only have one incoming transition other possibilities are from junctions
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
