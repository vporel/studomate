"use client";

import { useT } from "@/ui/i18n/useT";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import { useState } from "react";

type Props = {
	onInclude: () => void;
	includeDisabled?: boolean;
};

/** Toolbar icon of a program excluded from execution, opening an explanation dialog. */
export default function ExcludedFromExecutionWarning({
	onInclude,
	includeDisabled = false,
}: Props) {
	const t = useT("common.programExecution");
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				size="small"
				color="warning"
				startIcon={<WarningAmberIcon fontSize="small" />}
				title={t("warningTooltip")}
				onClick={() => setOpen(true)}
				sx={{ whiteSpace: "nowrap" }}
			>
				{t("warningLabel")}
			</Button>
			<Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>{t("modalTitle")}</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 1 }}>{t("modalBody")}</DialogContentText>
					<DialogContentText>{t("modalFreeText")}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>{t("close")}</Button>
					<Button
						variant="contained"
						disabled={includeDisabled}
						onClick={() => {
							onInclude();
							setOpen(false);
						}}
					>
						{t("include")}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
