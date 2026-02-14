"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { formatDate } from "@/lib/date";
import { Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";

const StatusBar = () => {
	const { projectAuthor, projectCreationDate } = useProjectStore(
		useShallow((state) => ({
			projectAuthor: state.project?.author,
			projectCreationDate: state.project?.creationDate,
		})),
	);
	return (
		<FlexBox
			centerVertical
			between
			className="status-bar"
			sx={{
				width: "100%",
				height: "25px",
				borderTop: "1px solid lightgray",
				padding: "10px",
				background: "white",
				zIndex: 100,
			}}
		>
			<FlexBox centerVertical>
				<Typography sx={{ fontSize: "0.85rem", color: "rgb(100, 100, 100)" }}>
					Auteur : {projectAuthor || "Inconnu"} | Date de création :{" "}
					{projectCreationDate ? formatDate(projectCreationDate, "dd/MM/yyyy") : "/"}
				</Typography>
			</FlexBox>

			<FlexBox centerVertical gap={1}></FlexBox>
		</FlexBox>
	);
};

export default StatusBar;
