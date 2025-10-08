"use client";

import Project from "@/schemas/project/Project.class";
import { useState } from "react";

export default function useProject(): {
	project: Project | null;
	setProject: (g: Project) => void;
	fileHandle: FileSystemFileHandle | null;
	setFileHandle: (fh: FileSystemFileHandle | null) => void;
} {
	const [project, setProject] = useState<Project | null>(new Project("Nouveau projet", ""));
	const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

	return {
		project,
		setProject,
		fileHandle,
		setFileHandle,
	};
}
