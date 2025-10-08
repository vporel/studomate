"use client";

import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CircleIcon from "@mui/icons-material/Circle";
// import CloseIcon from "@mui/icons-material/Close";
import CloseIcon from "@mui/icons-material/Delete";
import { alpha, Box, IconButton, Typography, useTheme } from "@mui/material";

export type PageTabProps = {
	id: string;
	title: string;
	active?: boolean;
	hasUnsavedChanges?: boolean;
};

const PageTab = ({ id, title, active, hasUnsavedChanges }: PageTabProps) => {
	const th = useTheme();

	return (
		<Box
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
					backgroundColor: "#dfdfdf",
					color: th.palette.text.primary,
					".page__tab__type-icon": { color: th.palette.primary.main },
					".page__tab__button-icon": { opacity: 1 },
					".circle-icon": { display: "none" },
					".close-icon": { display: "block" },
				},
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
					":hover": {
						background: "#cfcfcf",
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
