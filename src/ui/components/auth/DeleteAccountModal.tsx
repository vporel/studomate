"use client";

import { useT } from "@/ui/i18n/useT";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import CustomModal from "@/ui/components/mui/CustomModal";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";

interface DeleteAccountModalProps {
	open: boolean;
	cloudProjectCount: number;
	onClose: () => void;
}

export default function DeleteAccountModal({
	open,
	cloudProjectCount,
	onClose,
}: DeleteAccountModalProps) {
	const t = useT("auth.deleteAccount");
	const tError = useT("auth.errors");
	const deleteAccount = useAuthStore((state) => state.deleteAccount);
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleClose = useCallback(() => {
		if (submitting) return;
		setPassword("");
		setError(null);
		onClose();
	}, [submitting, onClose]);

	const handleSubmit = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result = await deleteAccount(password);
		setSubmitting(false);
		if (!result.ok) {
			setError(tError(result.code));
			return;
		}
		toast.success(t("deleted"));
	}, [deleteAccount, password, t, tError]);

	return (
		<CustomModal
			open={open}
			onClose={handleClose}
			title={t("title")}
			width={480}
		>
			<Box
				component="form"
				onSubmit={(e) => {
					e.preventDefault();
					void handleSubmit();
				}}
				sx={{ display: "flex", flexDirection: "column", gap: 2 }}
			>
				<Typography color="text.secondary">{t("warning")}</Typography>
				<Typography color="text.secondary">
					{cloudProjectCount > 0
						? t("repatriation", { count: cloudProjectCount })
						: t("noCloudProjects")}
				</Typography>

				<TextField
					label={t("passwordLabel")}
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoFocus
					required
				/>

				{error && (
					<Typography color="error" fontSize="0.9rem">
						{error}
					</Typography>
				)}

				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
					<Button onClick={handleClose} disabled={submitting}>
						{t("cancel")}
					</Button>
					<Button
						type="submit"
						variant="contained"
						color="error"
						disabled={submitting || password === ""}
					>
						{t("confirm")}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
