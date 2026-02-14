"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { platformShortcut } from "@/lib/platform";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useEditMenu(): AppMenuType {
	const { activeScopeType } = useProjectStore(
		useShallow((state) => ({
			activeScopeType: state.activeScopeType,
		})),
	);

	return useMemo(
		() => ({
			id: "edit",
			label: "Edition",
			items: [
				[
					{
						label: "Annuler",
						shortcut: platformShortcut("Ctrl+Z", "Cmd+Z"),
						disabled: activeScopeType !== "grafcet",
					},
					{
						label: "Rétablir",
						shortcut: platformShortcut("Ctrl+Y", "Cmd+Y"),
						disabled: activeScopeType !== "grafcet",
					},
				],
				[
					{
						label: "Copier",
						shortcut: platformShortcut("Ctrl+C", "Cmd+C"),
						disabled: activeScopeType !== "grafcet",
					},
					{
						label: "Coller",
						shortcut: platformShortcut("Ctrl+V", "Cmd+V"),
						disabled: activeScopeType !== "grafcet",
					},
				],
			],
		}),
		[],
	);
}
