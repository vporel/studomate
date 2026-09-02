import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import { useT } from "@/ui/i18n/useT";

const UnsavedChangesDialog = ({
	buttonsProps,
}: {
	buttonsProps?: {
		cancel?: {
			text?: string;
		};
		continueWithoutSaving?: {
			text?: string;
		};
		save?: {
			text?: string;
		};
	};
}) => {
	const t = useT("projects.unsavedChanges");
	const tc = useT("projects.common");
	const {
		visible,
		message,
		setVisible,
		lifecycleManager,
		onContinue,
		onCancel,
	} = useProjectStore(
		useShallow((state) => ({
			visible: state.ui.unsavedChangesDialogVisible,
			message: state.ui.unsavedChangesDialogMessage,
			setVisible: state.setUnsavedChangesDialogVisible,
			lifecycleManager: state.lifecycleManager,
			onContinue: state.ui.onUnsavedChangesDialogContinue,
			onCancel: state.ui.onUnsavedChangesDialogCancel,
		})),
	);

	const onClose = useCallback(() => {
		setVisible(false);
		if (onCancel) onCancel();
	}, [setVisible, onCancel]);

	const onContinueWithoutSaving = useCallback(() => {
		setVisible(false);
		if (onContinue) onContinue();
	}, [setVisible, onContinue]);

	const onSave = useCallback(async () => {
		setVisible(false);
		const result = await lifecycleManager.saveProject();
		if (result) {
			if (onContinue) onContinue();
		}
	}, [setVisible, lifecycleManager, onContinue]);

	return (
		<Dialog
			onClose={onClose}
			open={visible}
			aria-labelledby="customized-dialog-title"
		>
			<DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
				{t("title")}
			</DialogTitle>
			<Tooltip title={t("close")}>
				<IconButton
					aria-label="close"
					onClick={onClose}
					sx={(th) => ({
						position: "absolute",
						right: 8,
						top: 8,
						color: th.palette.grey[500],
					})}
				>
					<CloseIcon />
				</IconButton>
			</Tooltip>
			<DialogContent dividers>
				<Typography gutterBottom>
					{message ||
						t("defaultMessage")}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button autoFocus onClick={() => void onSave()}>
					{buttonsProps?.save?.text || tc("save")}
				</Button>
				<Button autoFocus onClick={onContinueWithoutSaving}>
					{buttonsProps?.continueWithoutSaving?.text ||
						t("continueWithoutSaving")}
				</Button>
				<Button autoFocus onClick={onClose}>
					{buttonsProps?.cancel?.text || tc("cancel")}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default UnsavedChangesDialog;
