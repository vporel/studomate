"use client";

import { useAppContext } from "@/components/AppContext";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useViewMenu(): AppMenuType {
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
		[viewAppearance, setViewAppearance],
	);
}
