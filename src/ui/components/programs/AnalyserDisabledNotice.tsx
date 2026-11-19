"use client";

import {
	getAnalyserDisabledNoticeHidden,
	setAnalyserDisabledNoticeHidden,
} from "@/persistence/preferences.storage";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import {
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
} from "@mui/material";
import { useEffect, useState } from "react";

/** Explanation shown each time the analyser of a program is disabled, until the user hides it for good. */
export default function AnalyserDisabledNotice() {
	const visible = useProjectStore((s) => s.ui.analyserDisabledNoticeVisible);
	const setVisible = useProjectStore((s) => s.setAnalyserDisabledNoticeVisible);
	const t = useT("common.programExecution");
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const hidden = visible && getAnalyserDisabledNoticeHidden();

	useEffect(() => {
		if (hidden) setVisible(false);
	}, [hidden, setVisible]);

	const close = () => {
		if (dontShowAgain) setAnalyserDisabledNoticeHidden();
		setDontShowAgain(false);
		setVisible(false);
	};

	return (
		<Dialog open={visible && !hidden} onClose={close} maxWidth="xs" fullWidth>
			<DialogTitle>{t("noticeTitle")}</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 1 }}>{t("noticeBody")}</DialogContentText>
				<DialogContentText sx={{ mb: 1 }}>
					{t("noticeFreeText")}
				</DialogContentText>
				<DialogContentText>{t("noticeEnable")}</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
				<FormControlLabel
					control={
						<Checkbox
							size="small"
							checked={dontShowAgain}
							onChange={(e) => setDontShowAgain(e.target.checked)}
						/>
					}
					label={t("dontShowAgain")}
				/>
				<Button variant="contained" onClick={close}>
					{t("close")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
