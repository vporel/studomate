"use client";

import { useAppContext } from "@/ui/components/AppContext";
import { useT } from "@/ui/i18n/useT";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useViewMenu(): AppMenuType {
	const { viewAppearance, setViewAppearance } = useAppContext();
	const t = useT("menu.view");

	return useMemo(
		() => ({
			id: "view",
			label: t("title"),
			items: [
				[
					{
						label: t("explorer"),
						checked: viewAppearance.explorer,
						onClick: () =>
							setViewAppearance({
								...viewAppearance,
								explorer: !viewAppearance.explorer,
							}),
					},
				],
			],
		}),
		[viewAppearance, setViewAppearance, t],
	);
}
