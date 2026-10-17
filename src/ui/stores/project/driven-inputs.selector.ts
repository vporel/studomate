import type { ProjectStoreState } from "./project.store.types";

type DrivenInputsState = Pick<
	ProjectStoreState,
	"hardwareLink" | "scene3dDrivenInputIds"
>;

/** True when a pin of the linked board or a sensor of the 3D scene is the source of this input. */
export function isInputDriven(
	state: DrivenInputsState,
	variableId: string,
): boolean {
	return (
		state.hardwareLink.drivenInputIds.includes(variableId) ||
		state.scene3dDrivenInputIds.includes(variableId)
	);
}

/** True when some inputs cannot be written from the UI, whichever of the board or the scene drives them. */
export function hasDrivenInputs(
	state: DrivenInputsState & { project: { hardwareTarget?: unknown } | null },
): boolean {
	return (
		(!!state.project?.hardwareTarget &&
			state.hardwareLink.status === "linked" &&
			state.hardwareLink.boardMode === "remote-io") ||
		state.scene3dDrivenInputIds.length > 0
	);
}
