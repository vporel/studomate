"use client";

import ResizableFixedBox from "@/ui/components/mui/ResizableFixedBox";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";

type BottomPanelProps = {
	title: string;
	closeLabel: string;
	closeAriaLabel: string;
	onClose: () => void;
	children: ReactNode;
};

export default function BottomPanel({
	title,
	closeLabel,
	closeAriaLabel,
	onClose,
	children,
}: BottomPanelProps) {
	return (
		<ResizableFixedBox
			position="bottom"
			initialSize={350}
			offset={30}
			contentContainerProps={{
				sx: { px: 2, py: 1, display: "flex", flexDirection: "column" },
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Typography variant="h6">{title}</Typography>
				<Tooltip title={closeLabel}>
					<IconButton
						onClick={onClose}
						size="small"
						aria-label={closeAriaLabel}
					>
						<CloseIcon />
					</IconButton>
				</Tooltip>
			</Box>
			<Divider sx={{ my: 1 }} />
			{children}
		</ResizableFixedBox>
	);
}
