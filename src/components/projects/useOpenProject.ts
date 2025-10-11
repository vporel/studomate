"use client";

import { openFileDialog, readFile } from "@/lib/file-system";
import Project from "@/schemas/project/Project.class";
import { useCallback } from "react";

export default function useOpenProject(
	setProject: (g: Project) => void,
	setFileHandle: (fh: FileSystemFileHandle | null) => void
): {
	openProject: () => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
} {
	const openProject = useCallback(async () => {
		const handle = await openFileDialog("Fichiers JSON", { "application/json": [".json"] });
		if (!handle) return false;
		const text = await readFile(handle);
		const json = JSON.parse(text);
		const newProject = Object.assign(Object.create(Project.prototype), json);
		setFileHandle(handle);
		setProject(newProject);
		return true;
	}, [setFileHandle, setProject]);

	return { openProject };
}
