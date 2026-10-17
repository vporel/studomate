"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { isInputDriven } from "@/ui/stores/project/driven-inputs.selector";

/** True when the project variable bound to a widget is an input driven by the linked board or by a 3D scene sensor. */
export default function useDrivenInputVariable(
	mnemonic: string | null | undefined,
): boolean {
	return useProjectStore((s) => {
		if (!mnemonic) return false;
		const variable = s.project?.variables.find((v) => v.mnemonic === mnemonic);
		return !!variable && isInputDriven(s, variable.id);
	});
}
