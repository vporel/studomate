"use client";

import { openSaveDialog, writeFile } from "@/lib/file-system";
import { deepObjectsComparison } from "@/lib/object";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { ProjectEventsOut } from "./project-events";

export type GrafcetRefData = {
	grafcet: Grafcet;
	flowNodes?: any[];
	flowEdges?: any[];
};

export default function useProjectSave(
	project: Project | null,
	setProject: Dispatch<SetStateAction<Project | null>>,
	fileHandle: FileSystemFileHandle | null,
	setFileHandle: (fh: FileSystemFileHandle | null) => void,
	projectEventsOut: Emitter<ProjectEventsOut>
): {
	hasUnsavedChanges: boolean;
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
	updateGrafcetData: (grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => void;
	saveGrafcetData: (grafcetId: string) => void; //Save in the projet object (not in the file)
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	savingProject: boolean;
} {
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const grafcetsRef = useRef<Record<string, GrafcetRefData>>({});
	const previousGrafcetsRef = useRef<Record<string, GrafcetRefData>>({});
	const [savingProject, setSavingProject] = useState(false);

	const updateGrafcetData = useCallback((grafcetId: string, data: GrafcetRefData) => {
		if (!grafcetsRef.current[grafcetId]) return;
		grafcetsRef.current[grafcetId] = { ...grafcetsRef.current[grafcetId], ...data };
		//Check if the grafcet data has changed compared to previousGrafcetsRef (only the grafcet property)
		const previousData = previousGrafcetsRef.current[grafcetId];
		if (
			!previousData ||
			!deepObjectsComparison(previousData.grafcet, grafcetsRef.current[grafcetId].grafcet)
		) {
			setHasUnsavedChanges(true);
		}
	}, []);

	const saveGrafcetData = useCallback((grafcetId: string) => {
		setProject((oldProject) => {
			if (!oldProject) return oldProject;
			const newProject = oldProject.copy();
			if (grafcetsRef.current[grafcetId]) {
				newProject.updateGrafcet(grafcetId, grafcetsRef.current[grafcetId].grafcet);
			}
			return newProject;
		});
	}, []);

	const saveProject = useCallback(async () => {
		if (!project) return false;
		const newProject = project.copy();
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
		projectEventsOut.emit("project-saved");
		setSavingProject(false);
		return true;
	}, [project, setProject, fileHandle, setFileHandle, projectEventsOut]);

	return {
		hasUnsavedChanges,
		setHasUnsavedChanges,
		updateGrafcetData,
		saveGrafcetData,
		saveProject,
		savingProject,
	};
}
