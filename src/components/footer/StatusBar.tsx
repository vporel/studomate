"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { formatDate } from "@/lib/date";
import { Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import RightActions from "./RightActions";

const StatusBar = () => {
	const { projectAuthor, projectLastModificationDate } = useProjectStore(
		useShallow((state) => ({
			projectAuthor: state.project?.author,
			projectLastModificationDate: state.project?.lastModificationDate,
		})),
	);
	return (
		<FlexBox
			centerVertical
			between
			className="status-bar"
			sx={{
				width: "100%",
				height: "30px",
				borderTop: "1px solid lightgray",
				padding: "10px",
				background: "white",
				zIndex: 100,
			}}
		>
			<FlexBox centerVertical>
				<Typography sx={{ fontSize: "0.85rem", color: "rgb(100, 100, 100)" }}>
					Auteur : {projectAuthor || "Inconnu"} | Dernière modification :{" "}
					{projectLastModificationDate
						? formatDate(projectLastModificationDate, "dd/MM/yyyy HH:mm")
						: "/"}
				</Typography>
			</FlexBox>

			<RightActions />
		</FlexBox>
	);
};

export default StatusBar;
