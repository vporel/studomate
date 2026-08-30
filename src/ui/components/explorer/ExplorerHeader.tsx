"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useAppContext } from "../AppContext";

const ExplorerHeader = () => {
	const { setViewAppearance } = useAppContext();

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
			<Tooltip title="Fermer">
				<IconButton
					size="small"
					sx={{ padding: "2px" }}
					onClick={() =>
						setViewAppearance((prev) => ({ ...prev, explorer: false }))
					}
					aria-label="Fermer l'explorateur"
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		</Box>
	);
};

export default ExplorerHeader;
