"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import { useAppContext } from "../AppContext";

const ExplorerHeader = () => {
	const t = useT("explorer");
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
			<Typography sx={{ fontSize: "0.8rem" }}>{t("headerTitle")}</Typography>
			<Tooltip title={t("close")}>
				<IconButton
					size="small"
					sx={{ padding: "2px" }}
					onClick={() =>
						setViewAppearance((prev) => ({ ...prev, explorer: false }))
					}
					aria-label={t("closeAria")}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		</Box>
	);
};

export default ExplorerHeader;
