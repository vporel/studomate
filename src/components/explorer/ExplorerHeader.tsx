"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Typography } from "@mui/material";

const ExplorerHeader = () => {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "3px 10px",
				userSelect: "none",
			}}
		>
			<Typography sx={{ fontSize: "0.8rem" }}>EXPLORATEUR</Typography>
			<IconButton size="small" sx={{ padding: "2px" }}>
				<CloseIcon fontSize="small" />
			</IconButton>
		</Box>
	);
};

export default ExplorerHeader;
