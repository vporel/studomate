"use client";

import { useT } from "@/ui/i18n/useT";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	LinearProgress,
	Typography,
} from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";

/**
 * Confirmation before the program of the board is erased, then a blocking progress bar while the
 * firmware is written and verified.
 */
const HardwareFirmwareDialog = () => {
	const t = useT("chrome.hardwareFirmwareDialog");
	const { firmware, hardwareLinkManager } = useProjectStore(
		useShallow((state) => ({
			firmware: state.hardwareFirmware,
			hardwareLinkManager: state.hardwareLinkManager,
		})),
	);

	if (firmware.phase === "idle" || !firmware.reason) return null;

	if (firmware.phase === "confirming") {
		return (
			<Dialog
				open
				onClose={() => hardwareLinkManager.answerFirmwareInstall(false)}
				aria-labelledby="hardware-firmware-title"
			>
				<DialogTitle id="hardware-firmware-title">
					{t(`${firmware.reason}.title`)}
				</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{t(`${firmware.reason}.message`)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => hardwareLinkManager.answerFirmwareInstall(false)}
					>
						{t("cancel")}
					</Button>
					<Button
						variant="contained"
						onClick={() => hardwareLinkManager.answerFirmwareInstall(true)}
					>
						{t("install")}
					</Button>
				</DialogActions>
			</Dialog>
		);
	}

	const { progress } = firmware;
	const value = progress
		? (progress.phase === "write" ? 0 : 50) +
			(progress.done / progress.total) * 50
		: 0;

	return (
		<Dialog
			open
			disableEscapeKeyDown
			onClose={() => {}}
			aria-labelledby="hardware-firmware-title"
		>
			<DialogTitle id="hardware-firmware-title">
				{t("flashing.title")}
			</DialogTitle>
			<DialogContent sx={{ minWidth: 360 }}>
				<LinearProgress
					variant={progress ? "determinate" : "indeterminate"}
					value={value}
					aria-label={t("flashing.title")}
					sx={{ mb: 2 }}
				/>
				<Typography variant="body2" color="text.secondary">
					{progress
						? t(`flashing.${progress.phase}`, {
								done: progress.done,
								total: progress.total,
							})
						: t("flashing.preparing")}
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
					{t("flashing.doNotUnplug")}
				</Typography>
			</DialogContent>
		</Dialog>
	);
};

export default HardwareFirmwareDialog;
