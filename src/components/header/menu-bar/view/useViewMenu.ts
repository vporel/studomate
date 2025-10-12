"use client";

import { useAppContext } from "@/components/AppContext";
import { useMemo } from "react";

export default function useViewMenu() {
	const { viewAppearance, setViewAppearance } = useAppContext();

	return useMemo(
		() => ({
			id: "view",
			label: "Vue",
			items: [
				[
					{
						label: "Explorateur",
						checked: viewAppearance.explorer,
						onClick: () =>
							setViewAppearance({ ...viewAppearance, explorer: !viewAppearance.explorer }),
					},
				],
			],
		}),
		[viewAppearance, setViewAppearance]
	);
}
