import { HmiPositionAnimation, HmiWidget } from "@/schemas/hmi/hmi-widget.schema";

/** Décalage de position d'un widget porté par son animation de position (voir
 * `HmiPositionAnimation`) — `x` et `y` ajoutés indépendamment, chacun `0` si sa variable est
 * absente/non résolue. `undefined` si le widget ne porte aucune animation de position. */
export function resolvePositionAnimationOffset(
	widget: HmiWidget,
	getVariableValue: (mnemonic: string) => unknown,
): { dx: number; dy: number } | undefined {
	const position = (widget.data as { animations?: { position?: HmiPositionAnimation } }).animations?.position;
	if (!position) return undefined;
	const dx = position.xVariableMnemonic ? Number(getVariableValue(position.xVariableMnemonic) ?? 0) : 0;
	const dy = position.yVariableMnemonic ? Number(getVariableValue(position.yVariableMnemonic) ?? 0) : 0;
	return { dx, dy };
}
