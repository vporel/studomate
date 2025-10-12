"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { formatDate } from "@/lib/date";
import { Typography } from "@mui/material";
import { useProjectContext } from "../projects/ProjectContext";

const StatusBar = () => {
	const { project } = useProjectContext();
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
					Auteur : {project?.author || "Inconnu"} | Date de création :{" "}
					{project ? formatDate(project.creationDate, "dd/MM/yyyy") : "/"}
				</Typography>
			</FlexBox>

			<FlexBox centerVertical gap={1}></FlexBox>
		</FlexBox>
	);
};

export default StatusBar;
