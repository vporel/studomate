"use client";

import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CircleIcon from "@mui/icons-material/Circle";
// import CloseIcon from "@mui/icons-material/Close";
import CloseIcon from "@mui/icons-material/Delete";
import { alpha, Box, IconButton, Typography, useTheme } from "@mui/material";
import { usePagesContext } from "./PagesContext";

export type PageTabProps = {
	id: string;
	title: string;
	hasUnsavedChanges?: boolean;
};

const PageTab = ({ id, title, hasUnsavedChanges }: PageTabProps) => {
	const th = useTheme();
	const { activePageId, setActivePageId } = usePagesContext();

	const active = id === activePageId;

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
				setActivePageId(id);
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<AccountTreeIcon
					className="page__tab__type-icon"
					sx={{
						transform: "rotate(90deg) translateX(-1px)",
						color: active ? "white" : th.palette.primary.main,
						fontSize: "1.2rem",
					}}
				/>
				<Typography component="span" sx={{ fontSize: "0.9rem" }}>
					{title}
				</Typography>
			</Box>
			<IconButton
				className="page__tab__button-icon"
				sx={{
					opacity: active || hasUnsavedChanges ? 1 : 0,
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
			>
				{hasUnsavedChanges && <CircleIcon className="circle-icon" sx={{ fontSize: "0.9rem" }} />}
				<CloseIcon
					className="close-icon"
					sx={{ fontSize: "0.9rem", display: hasUnsavedChanges ? "none" : "block" }}
				/>
			</IconButton>
		</Box>
	);
};

export default PageTab;
