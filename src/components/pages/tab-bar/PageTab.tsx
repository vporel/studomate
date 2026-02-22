"use client";

import InclinedAccountTreeIcon from "@/components/icons/InclinedAccountTree";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { PageType } from "@/stores/project/project-store-types";
import { Segment as SegmentIcon } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import TuneIcon from "@mui/icons-material/Tune";
import { alpha, Box, IconButton, Typography, useTheme } from "@mui/material";
import { useShallow } from "zustand/shallow";

export type PageTabProps = {
	id: string;
	title: string;
	type: PageType;
};

const PageTab = ({ id, title, type }: PageTabProps) => {
	const th = useTheme();
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const { activePageId } = useProjectStore(
		useShallow((state) => ({
			activePageId: state.activePageId,
		})),
	);
	const active = id === activePageId;
	const TypeIconComponent =
		type === "project-startup"
			? HomeIcon
			: type === "project-properties"
				? TuneIcon
				: type === "grafcet"
					? InclinedAccountTreeIcon
					: SegmentIcon;

	return (
		<Box
			tabIndex={0}
			className="pages__tab"
			data-page-id={id}
			sx={{
				height: "100%",
				width: "fit-content",
				padding: "5px 5px 5px 10px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "10px",
				cursor: "pointer",
				userSelect: "none",
				transition: "all .2s ease",
				position: "relative",
				backgroundColor: !active ? "white" : alpha(th.palette.primary.main, 1),
				color: !active ? th.palette.text.primary : "white",
				borderRight: "1px solid rgba(0, 0, 0, 0.1)",
				":hover": {
					backgroundColor: !active ? "#dfdfdf" : alpha(th.palette.primary.main, 1),
					color: !active ? th.palette.text.primary : "white",
					".page__tab__type-icon": { color: !active ? th.palette.primary.main : "white" },
					".page__tab__button-icon": { opacity: 1 },
					".circle-icon": { display: "none" },
					".close-icon": { display: "block" },
				},
			}}
			onClick={() => {
				pagesManager.setActivePage(id);
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<TypeIconComponent
					className="page__tab__type-icon"
					sx={{
						color: active ? "white" : th.palette.primary.main,
						fontSize: "1.2rem",
					}}
				/>
				<Typography component="span" sx={{ fontSize: "0.85rem" }}>
					{title}
				</Typography>
			</Box>
			<IconButton
				className="page__tab__button-icon"
				sx={{
					opacity: active ? 1 : 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "3px",
					borderRadius: "5px",
					color: !active ? th.palette.text.primary : "white",
					":hover": {
						background: !active ? "#cfcfcf" : "rgba(255, 255, 255, 0.2)",
					},
				}}
				onClick={(e) => {
					e.stopPropagation();
					pagesManager.closePage(id);
				}}
			>
				<CloseIcon className="close-icon" sx={{ fontSize: "0.9rem", display: "block" }} />
			</IconButton>
		</Box>
	);
};

export default PageTab;
