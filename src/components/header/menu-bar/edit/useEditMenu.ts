"use client";

import { useMemo } from "react";

export default function useEditMenu() {
	return useMemo(
		() => ({
			id: "edit",
			label: "Edition",
			items: [
				[
					{
						label: "Annuler",
						shortcut: "Ctrl+Z",
					},
					{
						label: "Rétablir",
						shortcut: "Ctrl+Y",
					},
				],
				[
					{
						label: "Copier",
						shortcut: "Ctrl+C",
					},
					{
						label: "Coller",
						shortcut: "Ctrl+V",
					},
				],
			],
		}),
		[]
	);
}
