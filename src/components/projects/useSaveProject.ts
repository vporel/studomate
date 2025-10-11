"use client";

import { openSaveDialog, writeFile } from "@/lib/file-system";
import { deepObjectsComparison } from "@/lib/object";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { useCallback, useRef, useState } from "react";
import { ProjectEvents } from "./project-events";

export default function useSaveProject(
	project: Project | null,
	setProject: (g: Project) => void,
	fileHandle: FileSystemFileHandle | null,
	setFileHandle: (fh: FileSystemFileHandle | null) => void,
	projectEvents: Emitter<ProjectEvents>
): {
	hasUnsavedChanges: boolean;
	updateGrafcetData: (grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => void;
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	savingProject: boolean;
} {
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const grafcetsRef = useRef<Record<string, { grafcet?: Grafcet; flowNodes?: any[] }>>({});
	const previousGrafcetsRef = useRef<Record<string, { grafcet?: Grafcet; flowNodes?: any[] }>>({});
	const [savingProject, setSavingProject] = useState(false);

	const updateGrafcetData = useCallback(
		(grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => {
			if (!grafcetsRef.current[grafcetId]) grafcetsRef.current[grafcetId] = {};
			grafcetsRef.current[grafcetId] = { ...grafcetsRef.current[grafcetId], ...data };
			//Check if the grafcet data has changed compared to previousGrafcetsRef (only the grafcet property)
			const previousData = previousGrafcetsRef.current[grafcetId];
			if (
				!previousData ||
				!deepObjectsComparison(previousData.grafcet, grafcetsRef.current[grafcetId].grafcet)
			) {
				setHasUnsavedChanges(true);
			}
		},
		[]
	);

	const saveProject = useCallback(async () => {
		const newProject = Object.assign(Object.create(Project.prototype), project);
		for (const grafcetId in grafcetsRef.current) {
			if (grafcetsRef.current[grafcetId].grafcet) {
				newProject.updateGrafcet(grafcetId, grafcetsRef.current[grafcetId].grafcet);
			}
		}
		//Update the project's last modified date
		newProject.touch();
		setProject(newProject);

		//If no fileHandle, open a save dialog
		let handle = fileHandle;
		if (!handle) {
			//Open a save dialog
			handle = await openSaveDialog(
				"Fichiers JSON",
				{ "application/json": [".json"] },
				newProject.name + ".json"
			);
			setFileHandle(handle);
		}
		if (!handle) return null;
		setSavingProject(true);
		//Save the project to the file
		await writeFile(newProject, handle);
		// Update previousGrafcetsRef
		previousGrafcetsRef.current = structuredClone(grafcetsRef.current);
		setHasUnsavedChanges(false);
		projectEvents.emit("saved");
		setSavingProject(false);
		return true;
	}, [project, setProject, fileHandle, setFileHandle, projectEvents]);

	return { hasUnsavedChanges, updateGrafcetData, saveProject, savingProject };
}
