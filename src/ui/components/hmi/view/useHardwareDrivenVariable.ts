"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";

/** True when the project variable bound to a widget is an input driven by the linked board. */
export default function useHardwareDrivenVariable(
	mnemonic: string | null | undefined,
): boolean {
	return useProjectStore((s) => {
		if (!mnemonic) return false;
		const variable = s.project?.variables.find((v) => v.mnemonic === mnemonic);
		return !!variable && s.hardwareLink.drivenInputIds.includes(variable.id);
	});
}
