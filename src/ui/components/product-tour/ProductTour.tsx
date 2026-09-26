"use client";

import shouldStartProductTour from "@/ui/lib/product-tour/product-tour-eligibility";
import { useEffect } from "react";
import useStartProductTour from "./useStartProductTour";

const LAYOUT_SETTLE_DELAY_MS = 400;

const ProductTour = () => {
	const startProductTour = useStartProductTour();

	useEffect(() => {
		if (!shouldStartProductTour()) return;
		let cancelled = false;
		let tour: Awaited<ReturnType<typeof startProductTour>> = null;
		const timeout = setTimeout(() => {
			void startProductTour().then((started) => {
				if (cancelled) started?.destroy();
				else tour = started;
			});
		}, LAYOUT_SETTLE_DELAY_MS);
		return () => {
			cancelled = true;
			clearTimeout(timeout);
			tour?.destroy();
		};
	}, [startProductTour]);

	return null;
};

export default ProductTour;
