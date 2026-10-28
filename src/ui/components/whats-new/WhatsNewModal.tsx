"use client";

import { APP_VERSION } from "@/app-info";
import CustomModal from "@/ui/components/mui/CustomModal";
import { useT } from "@/ui/i18n/useT";
import WHATS_NEW_SLIDE_IDS, {
	type WhatsNewSlideId,
} from "@/whats-new/whats-new-slides";
import CloseIcon from "@mui/icons-material/Close";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import {
	Box,
	Button,
	Chip,
	Fade,
	IconButton,
	MobileStepper,
	Tooltip,
	Typography,
} from "@mui/material";
import { useState } from "react";

const SLIDE_ICONS: Record<WhatsNewSlideId, typeof WifiOffIcon> = {
	offline: WifiOffIcon,
	scene3d: ViewInArIcon,
};

export default function WhatsNewModal({ onClose }: { onClose: () => void }) {
	const t = useT("whatsNew");
	const tModal = useT("common.modal");
	const [index, setIndex] = useState(0);
	const slideId = WHATS_NEW_SLIDE_IDS[index];
	const SlideIcon = SLIDE_ICONS[slideId];
	const isLast = index === WHATS_NEW_SLIDE_IDS.length - 1;
	const title = t("title", { version: APP_VERSION });

	return (
		<CustomModal
			open
			onClose={onClose}
			closeButton={false}
			compact
			width={480}
			aria-label={title}
			sx={{ overflow: "hidden" }}
		>
			<Box
				sx={(theme) => ({
					position: "relative",
					height: 190,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "primary.contrastText",
					background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
					overflow: "hidden",
				})}
			>
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						width: 260,
						height: 260,
						borderRadius: "50%",
						top: -120,
						right: -70,
						background: "rgba(255, 255, 255, 0.1)",
					}}
				/>
				<Box
					aria-hidden
					sx={{
						position: "absolute",
						width: 160,
						height: 160,
						borderRadius: "50%",
						bottom: -90,
						left: -40,
						background: "rgba(255, 255, 255, 0.08)",
					}}
				/>
				<Chip
					label={title}
					size="small"
					sx={{
						position: "absolute",
						top: 14,
						left: 14,
						fontWeight: 600,
						color: "inherit",
						background: "rgba(255, 255, 255, 0.2)",
					}}
				/>
				<Tooltip title={tModal("close")}>
					<IconButton
						onClick={onClose}
						aria-label={tModal("close")}
						size="small"
						sx={{ position: "absolute", top: 8, right: 8, color: "inherit" }}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</Tooltip>
				<Fade key={slideId} in timeout={400}>
					<Box
						sx={{
							width: 88,
							height: 88,
							borderRadius: "50%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							background: "rgba(255, 255, 255, 0.2)",
							boxShadow: "0 0 0 10px rgba(255, 255, 255, 0.12)",
						}}
					>
						<SlideIcon sx={{ fontSize: 46 }} />
					</Box>
				</Fade>
			</Box>
			<Box
				sx={{
					p: { xs: 2.5, md: 3 },
					display: "flex",
					flexDirection: "column",
					gap: 2,
				}}
			>
				<Fade key={slideId} in timeout={400}>
					<Box sx={{ minHeight: 120 }} aria-live="polite">
						<Typography variant="h3" mb={1}>
							{t(`slides.${slideId}.title`)}
						</Typography>
						<Typography variant="body2" color="text.secondary" lineHeight={1.7}>
							{t(`slides.${slideId}.body`)}
						</Typography>
					</Box>
				</Fade>
				<MobileStepper
					variant="dots"
					steps={WHATS_NEW_SLIDE_IDS.length}
					activeStep={index}
					position="static"
					sx={{ p: 0, background: "transparent" }}
					backButton={
						<Button
							size="small"
							color="inherit"
							onClick={() => setIndex(index - 1)}
							disabled={index === 0}
						>
							{t("previous")}
						</Button>
					}
					nextButton={
						isLast ? (
							<Button
								size="small"
								variant="contained"
								disableElevation
								onClick={onClose}
							>
								{t("done")}
							</Button>
						) : (
							<Button
								size="small"
								variant="contained"
								disableElevation
								onClick={() => setIndex(index + 1)}
							>
								{t("next")}
							</Button>
						)
					}
				/>
			</Box>
		</CustomModal>
	);
}
