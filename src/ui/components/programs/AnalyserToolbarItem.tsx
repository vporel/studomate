"use client";

import { useT } from "@/ui/i18n/useT";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import { useState } from "react";

type Props = {
	excluded: boolean;
	simulating: boolean;
	/** The surrounding interface lets the user change `excluded` (`programExecutionExclusionToggle`). */
	toggleAvailable: boolean;
	disabled?: boolean;
	onToggle: (excluded: boolean) => void;
};

/**
 * Toolbar item for the analyser of a program (`excludedFromExecution`): a button disabling or
 * enabling it in design mode, otherwise a warning on an excluded program that explains on click why
 * it is not executed.
 */
export default function AnalyserToolbarItem({
	excluded,
	simulating,
	toggleAvailable,
	disabled = false,
	onToggle,
}: Props) {
	const t = useT("common.programExecution");
	const [explanationOpen, setExplanationOpen] = useState(false);

	if (!toggleAvailable || simulating) {
		if (!excluded) return null;
		return (
			<>
				<Chip
					size="small"
					color="warning"
					variant="outlined"
					icon={<WarningAmberIcon fontSize="small" />}
					label={t("badge")}
					title={t("enableTooltip")}
					onClick={() => setExplanationOpen(true)}
					sx={{ flexShrink: 0 }}
				/>
				<Dialog
					open={explanationOpen}
					onClose={() => setExplanationOpen(false)}
					maxWidth="xs"
					fullWidth
				>
					<DialogTitle>{t("notExecutedTitle")}</DialogTitle>
					<DialogContent>
						<DialogContentText>{t("notExecutedBody")}</DialogContentText>
						{toggleAvailable && (
							<DialogContentText sx={{ mt: 1 }}>
								{t("notExecutedEnable")}
							</DialogContentText>
						)}
					</DialogContent>
					<DialogActions>
						<Button
							variant="contained"
							onClick={() => setExplanationOpen(false)}
						>
							{t("close")}
						</Button>
					</DialogActions>
				</Dialog>
			</>
		);
	}

	return (
		<Button
			size="small"
			color={excluded ? "warning" : "inherit"}
			startIcon={excluded ? <WarningAmberIcon fontSize="small" /> : undefined}
			title={t(excluded ? "enableTooltip" : "disableTooltip")}
			disabled={disabled}
			onClick={() => onToggle(!excluded)}
			sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
		>
			{t(excluded ? "enable" : "disable")}
		</Button>
	);
}
