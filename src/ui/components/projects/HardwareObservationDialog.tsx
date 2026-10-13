"use client";

import { useT } from "@/ui/i18n/useT";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";

/** Asks whether to start the program of the board, which has to run to be observed. */
const HardwareObservationDialog = () => {
	const t = useT("chrome.hardwareObservationDialog");
	const { phase, hardwareLinkManager } = useProjectStore(
		useShallow((state) => ({
			phase: state.hardwareObservation.phase,
			hardwareLinkManager: state.hardwareLinkManager,
		})),
	);

	if (phase !== "confirming") return null;

	return (
		<Dialog
			open
			onClose={() => hardwareLinkManager.answerObservationStart(false)}
			aria-labelledby="hardware-observation-title"
		>
			<DialogTitle id="hardware-observation-title">{t("title")}</DialogTitle>
			<DialogContent>
				<DialogContentText>{t("message")}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => hardwareLinkManager.answerObservationStart(false)}
				>
					{t("cancel")}
				</Button>
				<Button
					variant="contained"
					onClick={() => hardwareLinkManager.answerObservationStart(true)}
				>
					{t("start")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default HardwareObservationDialog;
