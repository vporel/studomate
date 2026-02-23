"use client";

import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useHelpMenu(): AppMenuType {
	return useMemo(
		() => ({
			id: "help",
			label: "Aide",
			items: [
				[
					{
						label: "Manuel utilisateur",
						onClick: () => {},
					},
				],
			],
		}),
		[],
	);
}
