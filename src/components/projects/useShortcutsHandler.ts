"use client";

import { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import React, { useEffect } from "react";

export default function useShortcutsHandler(
	newGrafcet: (name: string, format: GrafcetFormat) => void,
	openProject: () => void,
	saveProject: () => void
) {
	useEffect(() => {
		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "o": {
						e.stopPropagation();
						e.preventDefault();
						openProject();
						break;
					}
					case "s": {
						e.stopPropagation();
						e.preventDefault();
						saveProject();
						break;
					}
					case "g": {
						e.stopPropagation();
						e.preventDefault();
						newGrafcet("Sans titre", { type: "A4", orientation: "portrait" });
						break;
					}
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown as any);
		return () => {
			document.removeEventListener("keydown", handleKeyDown as any);
		};
	}, [newGrafcet, openProject, saveProject]);
}
