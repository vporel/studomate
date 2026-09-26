"use client";

import {
	InputBehavior,
	InputBehaviorKind,
} from "@/schemas/variable/input-behavior";
import { useT } from "@/ui/i18n/useT";
import { useCallback } from "react";

export const INPUT_BEHAVIOR_KIND_LABEL_KEYS = {
	"push-button-no": "pushButtonNo",
	"push-button-nc": "pushButtonNc",
	"toggle-switch-no": "toggleSwitchNo",
	"toggle-switch-nc": "toggleSwitchNc",
	slider: "slider",
} as const satisfies Record<InputBehaviorKind, string>;

/** Short label of an input behavior (`"Curseur (0 … 100)"`, `"Bouton poussoir NF"`...), empty
 * when no behavior is defined. */
export default function useFormatInputBehavior() {
	const t = useT("pages.variablesGrid.behavior");
	return useCallback(
		(behavior: InputBehavior | null | undefined): string => {
			if (!behavior) return "";
			if (behavior.kind === "slider")
				return t("sliderSummary", {
					min: behavior.params.min,
					max: behavior.params.max,
				});
			return t(INPUT_BEHAVIOR_KIND_LABEL_KEYS[behavior.kind]);
		},
		[t],
	);
}
