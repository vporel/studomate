"use client";

import { InputBehavior } from "@/schemas/variable/input-behavior";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

/** Behavior of the project variable bound to a widget, `null` when unbound, undeclared or
 * without behavior. */
export default function useBoundInputBehavior(
	mnemonic: string | null | undefined,
): InputBehavior | null {
	return useProjectStore((s) =>
		mnemonic
			? (s.project?.variables.find((v) => v.mnemonic === mnemonic)?.behavior ??
				null)
			: null,
	);
}
