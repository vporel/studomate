"use client";

import { Box } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

const ProjectNameInput = () => {
	const { projectName, changeProjectName } = useProjectStore(
		useShallow((state) => ({
			projectName: state.project?.name ?? "",
			changeProjectName: state.setProjectName,
		})),
	);
	const projectNameInputRef = useRef<HTMLInputElement>(null);
	const [editingProjectName, setEditingProjectName] = useState<string>(projectName);

	const saveProjectName = useCallback(() => {
		changeProjectName(editingProjectName.trim() !== "" ? editingProjectName.trim() : projectName);
	}, [editingProjectName, projectName, changeProjectName]);

	useEffect(() => {
		setEditingProjectName(projectName);
	}, [projectName]);
	return (
		<Box
			ref={projectNameInputRef}
			component="input"
			value={editingProjectName}
			onChange={(e) => setEditingProjectName(e.target.value)}
			onBlur={() => {
				saveProjectName();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					projectNameInputRef.current?.blur();
					saveProjectName();
				}
			}}
			sx={{
				flex: 1,
				width: "250px",
				textAlign: "center",
			}}
		/>
	);
};

export default ProjectNameInput;
