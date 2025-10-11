import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

const UnsavedChangesDialog = ({
	open,
	message,
	onCancel,
	onContinueWithoutSaving,
	onSave,
}: {
	open: boolean;
	message: string;
	onCancel: () => void;
	onContinueWithoutSaving: () => void;
	onSave: () => void;
}) => {
	return (
		<Dialog onClose={onCancel} open={open}>
			<DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
				Modifications non enregistrées
			</DialogTitle>
			<IconButton
				aria-label="close"
				onClick={onCancel}
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
				<Typography gutterBottom>{message}</Typography>
			</DialogContent>
			<DialogActions>
				<Button autoFocus onClick={onSave}>
					Enregistrer
				</Button>
				<Button autoFocus onClick={onContinueWithoutSaving}>
					Quitter sans enregistrer
				</Button>
				<Button autoFocus onClick={onCancel}>
					Annuler
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default UnsavedChangesDialog;
