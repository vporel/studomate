"use client";

import React, { useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";

export default function useShortcutsHandler() {
	const { setOpenModalVisible, saveProject, newGrafcet } = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			saveProject: state.saveProject,
			newGrafcet: state.newGrafcet,
		})),
	);

	useEffect(() => {
		const handleKeyDown = (e: React.KeyboardEvent) => {
			const isInput =
				(e.target as HTMLElement).tagName === "INPUT" ||
				(e.target as HTMLElement).tagName === "TEXTAREA";
			if (isInput) return; //Don't trigger shortcuts when the user is typing in an input or textarea
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "z": {
						//Prevent the default undo behavior of the browser, which can cause issues with our custom undo implementation
						e.stopPropagation();
						e.preventDefault();
						break;
					}
					case "o": {
						e.stopPropagation();
						e.preventDefault();
						setOpenModalVisible(true);
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
	}, [newGrafcet, setOpenModalVisible, saveProject]);
}
