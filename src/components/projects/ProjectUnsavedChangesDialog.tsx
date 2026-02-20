import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";

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
	const { visible, message, setVisible, saveProject, onContinue, onCancel } = useProjectStore(
		useShallow((state) => ({
			visible: state.unsavedChangesDialogVisible,
			message: state.unsavedChangesDialogMessage,
			setVisible: state.setUnsavedChangesDialogVisible,
			saveProject: state.saveProject,
			onContinue: state.onUnsavedChangesDialogContinue,
			onCancel: state.onUnsavedChangesDialogCancel,
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
		const result = await saveProject();
		if (result) {
			if (onContinue) onContinue();
		}
	}, [setVisible, saveProject, onContinue]);

	return (
		<Dialog onClose={onClose} open={visible}>
			<DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
				Modifications non enregistrées
			</DialogTitle>
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
			<DialogContent dividers>
				<Typography gutterBottom>
					{message || "Voulez-vous enregistrer les modifications avant de quitter le projet ?"}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button autoFocus onClick={onSave}>
					{buttonsProps?.save?.text || "Enregistrer"}
				</Button>
				<Button autoFocus onClick={onContinueWithoutSaving}>
					{buttonsProps?.continueWithoutSaving?.text || "Continuer sans enregistrer"}
				</Button>
				<Button autoFocus onClick={onClose}>
					{buttonsProps?.cancel?.text || "Annuler"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default UnsavedChangesDialog;
