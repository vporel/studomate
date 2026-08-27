import {
	ElementType,
	JUNCTION_TYPES,
	JunctionType,
} from "@/schemas/grafcet/element.schema";
import { HANDLES_TO_TYPES_MAP } from "../builders/connection.builder";
import Connection from "../connection.schema";
import Grafcet from "../grafcet.schema";
import { JUNCTION_AND_END_HANDLE_BRANCH_TYPES } from "../junction-and-end.schema";
import { JUNCTION_AND_START_HANDLE_BRANCH_TYPES } from "../junction-and-start.schema";
import { JUNCTION_OR_END_HANDLE_BRANCH_TYPES } from "../junction-or-end.schema";
import { JUNCTION_OR_START_HANDLE_BRANCH_TYPES } from "../junction-or-start.schema";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";

const JUNCTIONS_BRANCHES_ALLOWED_TYPES: Record<
	JunctionType,
	readonly ElementType[]
> = {
	"junction-and-start": JUNCTION_AND_START_HANDLE_BRANCH_TYPES,
	"junction-and-end": JUNCTION_AND_END_HANDLE_BRANCH_TYPES,
	"junction-or-start": JUNCTION_OR_START_HANDLE_BRANCH_TYPES,
	"junction-or-end": JUNCTION_OR_END_HANDLE_BRANCH_TYPES,
};

/**
 * Index optionnel, construit une fois par l'appelant qui valide beaucoup de connexions d'affilée
 * (`GrafcetAnalyser.checkConnectionTypes`), pour éviter les `.find`/`.filter` linéaires internes.
 */
export type ConnectionsValidationIndex = {
	elementTypeById: Map<string, ElementType>;
	connectionsByElementId: Map<string, Connection[]>;
};

export default class ConnectionsValidator {
	static validateNewConnection(
		connection: {
			sourceId: string;
			targetId: string;
			sourceHandle: string;
			targetHandle: string;
		},
		grafcet: Grafcet,
		index?: ConnectionsValidationIndex,
	): boolean {
		const sourceType =
			index?.elementTypeById.get(connection.sourceId) ??
			(grafcet.getElementById(connection.sourceId)!.type as ElementType);
		const targetType =
			index?.elementTypeById.get(connection.targetId) ??
			(grafcet.getElementById(connection.targetId)!.type as ElementType);
		//Junctions branches case
		if (
			JUNCTION_TYPES.includes(sourceType as JunctionType) &&
			connection.sourceHandle !== JUNCTION_HANDLE_PIVOT
		) {
			const allowedTypesForBranchHandle =
				JUNCTIONS_BRANCHES_ALLOWED_TYPES[sourceType as JunctionType];
			if (allowedTypesForBranchHandle) {
				return allowedTypesForBranchHandle.includes(targetType);
			}
		}
		if (
			JUNCTION_TYPES.includes(targetType as JunctionType) &&
			connection.targetHandle !== JUNCTION_HANDLE_PIVOT
		) {
			const allowedTypesForBranchHandle =
				JUNCTIONS_BRANCHES_ALLOWED_TYPES[targetType as JunctionType];
			if (allowedTypesForBranchHandle) {
				return allowedTypesForBranchHandle.includes(sourceType);
			}
		}

		//Other cases
		let handlesMapsCheck = true;
		const sourceHandleToTypes = HANDLES_TO_TYPES_MAP[sourceType];
		const targetHandleToTypes = HANDLES_TO_TYPES_MAP[targetType];
		if (!sourceHandleToTypes || !targetHandleToTypes) return false; //One element type is not mapped
		if (sourceHandleToTypes) {
			const allowedTargetTypesForSourceHandle =
				sourceHandleToTypes[connection.sourceHandle];
			if (allowedTargetTypesForSourceHandle) {
				handlesMapsCheck =
					handlesMapsCheck &&
					allowedTargetTypesForSourceHandle.includes(targetType);
			}
		}
		if (targetHandleToTypes) {
			const allowedSourceTypesForTargetHandle =
				targetHandleToTypes[connection.targetHandle];
			if (allowedSourceTypesForTargetHandle) {
				return (
					handlesMapsCheck &&
					allowedSourceTypesForTargetHandle.includes(sourceType)
				);
			}
		}
		//-- Complementary validation rules that are not covered by the handles to types map --
		//Number of connections that targets a step
		const targetElementConnections = (
			index?.connectionsByElementId.get(connection.targetId) ??
			grafcet.getConnectionsByElementId(connection.targetId)
		).filter(
			(c) =>
				(c.source.id === connection.targetId &&
					c.source.handle === connection.targetHandle) ||
				(c.target.id === connection.targetId &&
					c.target.handle === connection.targetHandle),
		);
		if (sourceType == "transition" && targetType == "step") {
			return targetElementConnections.length == 0; //A step can only have one incoming transition other possibilities are from junctions
		}
		return false;
	}
}
