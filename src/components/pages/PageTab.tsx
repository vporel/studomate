"use client";

import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CircleIcon from "@mui/icons-material/Circle";
// import CloseIcon from "@mui/icons-material/Close";
import CloseIcon from "@mui/icons-material/Delete";
import { alpha, Box, Typography, useTheme } from "@mui/material";

export type PageTabProps = {
	id: string;
	title: string;
	active?: boolean;
	hasChanges?: boolean;
};

const PageTab = ({ id, title, active, hasChanges }: PageTabProps) => {
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
					".page__tab-icon": { opacity: 1 },
				},
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<AccountTreeIcon
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
			<Box
				className="page__tab-icon"
				sx={{
					opacity: active || hasChanges ? 1 : 0,
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
				{hasChanges ? (
					<CircleIcon sx={{ fontSize: "0.9rem" }} />
				) : (
					<CloseIcon sx={{ fontSize: "0.9rem" }} />
				)}
			</Box>
		</Box>
	);
};

export default PageTab;
