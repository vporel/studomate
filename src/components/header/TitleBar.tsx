"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectContext } from "../projects/ProjectContext";

const TitleBar = () => {
	const { project, hasUnsavedChanges, saveProject, savingProject, changeProjectName } = useProjectContext();
	const projectNameInputRef = useRef<HTMLInputElement>(null);
	const [editingProjectName, setEditingProjectName] = useState<string>(project?.name ?? "");
	const saveProjectName = useCallback(() => {
		changeProjectName(editingProjectName.trim() !== "" ? editingProjectName.trim() : project?.name ?? "");
	}, [editingProjectName, project?.name, changeProjectName]);

	useEffect(() => {
		setEditingProjectName(project?.name ?? "");
	}, [project?.name]);

	return (
		<FlexBox
			centerVertical
			sx={{
				width: "100%",
				height: "25px",
				backgroundColor: "white",
				paddingLeft: "5px",
				gap: "10px",
			}}
		>
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
					fontWeight: "bold",
					width: "250px",
				}}
			/>

			{hasUnsavedChanges && (
				<Typography
					color="error"
					style={{
						background: "rgba(255, 100, 0, 0.2)",
						padding: "2px",
						borderRadius: "5px",
						fontSize: "0.8rem",
						cursor: "pointer",
						userSelect: "none",
						opacity: savingProject ? 0.5 : 1,
					}}
					onClick={async () => {
						if (savingProject) return;
						await saveProject();
					}}
				>
					Cliquez ici pour enregistrer.
				</Typography>
			)}
			{savingProject && <CircularProgress size={15} />}
		</FlexBox>
	);
};

export default TitleBar;
