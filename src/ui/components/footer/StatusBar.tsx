"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Typography } from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";
import RightActions from "./RightActions";

const StatusBar = () => {
	const t = useT("chrome.statusBar");
	const projectAuthor = useProjectStore((state) => state.project?.author);
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
					{t("author", { name: projectAuthor || t("unknownAuthor") })}
				</Typography>
			</FlexBox>

			<RightActions />
		</FlexBox>
	);
};

export default StatusBar;
