"use client";

import { useT } from "@/ui/i18n/useT";
import { PRODUCT_TOUR_STEP_IDS } from "@/ui/components/product-tour/product-tour-steps";
import type { Driver } from "driver.js";
import { useCallback } from "react";

export default function useStartProductTour(): () => Promise<Driver | null> {
	const t = useT("tour");
	return useCallback(async () => {
		const { default: startProductTour } = await import(
			"@/ui/components/product-tour/start-product-tour"
		);
		return startProductTour(
			PRODUCT_TOUR_STEP_IDS.map((id) => ({
				id,
				title: t(`steps.${id}.title`),
				description: t(`steps.${id}.description`),
			})),
			{
				next: t("buttons.next"),
				previous: t("buttons.previous"),
				done: t("buttons.done"),
			},
		);
	}, [t]);
}
