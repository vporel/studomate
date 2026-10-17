"use client";

import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";

type ConflictDialogAction = {
	label: string;
	variant: "outlined" | "contained";
	onClick: () => void;
};

type ConflictDialogProps = {
	title: string;
	paragraphs: [string, string];
	actions: ConflictDialogAction[];
};

export default function ConflictDialog({
	title,
	paragraphs,
	actions,
}: ConflictDialogProps) {
	return (
		<Dialog open maxWidth="xs" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<Typography variant="body2">{paragraphs[0]}</Typography>
				<Typography variant="body2" mt={1}>
					{paragraphs[1]}
				</Typography>
			</DialogContent>
			<DialogActions>
				{actions.map(({ label, variant, onClick }) => (
					<Button key={label} variant={variant} onClick={onClick}>
						{label}
					</Button>
				))}
			</DialogActions>
		</Dialog>
	);
}
