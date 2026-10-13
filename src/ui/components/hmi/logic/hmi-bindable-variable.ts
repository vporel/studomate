import type Project from "@/schemas/project/project.schema";
import type { VariableZone } from "@/schemas/variable/variable.schema";

export const NON_BINDABLE_ZONES: readonly VariableZone[] = ["constant"];

/** A constant is never bound to an HMI widget: a binding persisted on one is ignored, for
 * reading and for writing. */
export function isHmiBindable(
	project: Project | null | undefined,
	mnemonic: string,
): boolean {
	return !project?.variables.some(
		(variable) => variable.mnemonic === mnemonic && variable.zone === "constant",
	);
}
