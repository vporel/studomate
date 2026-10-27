"use client";

import { useT } from "@/ui/i18n/useT";
import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	BoxProps,
	IconButton,
	Modal as MuiModal,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useId } from "react";

/**
 * Mui modal with a predefined style
 * @param param0
 * @returns
 */
export default function CustomModal({
	open,
	onClose,
	sx,
	children,
	title,
	closeButton = true,
	fullscreenOnMobile = false,
	compact = false,
	flexColumn = false,
	width,
	height,
	...props
}: BoxProps & {
	open: boolean;
	onClose: any;
	closeButton?: boolean;
	width?: number | string;
	height?: number | string;
	fullscreenOnMobile?: boolean;
	/** No padding, small title and bordered header. */
	compact?: boolean;
	/** Lays the content out in a flex column, so the body can scroll under the header. */
	flexColumn?: boolean;
}) {
	const titleId = useId();
	const t = useT("common.modal");

	useEffect(() => {
		document.body.style.overflowY = open ? "hidden" : "auto";
	}, [open]);

	return (
		<MuiModal open={open} onClose={onClose}>
			<Box
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? titleId : undefined}
				sx={{
					outline: "none",
					background: "white",
					borderRadius: { xs: fullscreenOnMobile ? "0" : "10px", md: "10px" },
					p: compact ? 0 : { xs: 3, md: 3.5 },
					boxShadow: "0 0 5px rgba(0, 0, 0, .3)",
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: width ?? {
						xs: fullscreenOnMobile ? "100%" : "90%",
						md: "auto",
					},
					height: height ?? {
						xs: fullscreenOnMobile ? "100%" : "auto",
						md: "auto",
					},
					...(flexColumn && { display: "flex", flexDirection: "column" }),
					...sx,
				}}
				{...props}
			>
				{(title || closeButton) && (
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems={{
							xs: fullscreenOnMobile ? "start" : "center",
							md: "center",
						}}
						{...(compact
							? { px: 2, py: 1, borderBottom: "1px solid #e0e0e0" }
							: { mb: 2 })}
					>
						<Typography variant={compact ? "h6" : "h3"} id={titleId}>
							{title}
						</Typography>
						{closeButton && (
							<Tooltip title={t("close")}>
								<IconButton
									onClick={onClose}
									aria-label={t("close")}
									size={compact ? "small" : "medium"}
								>
									<CloseIcon
										sx={compact ? undefined : { width: 25, height: 25 }}
										fontSize={compact ? "small" : undefined}
									/>
								</IconButton>
							</Tooltip>
						)}
					</Box>
				)}
				{children}
			</Box>
		</MuiModal>
	);
}
