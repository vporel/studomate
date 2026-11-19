"use client";

import { toLocale } from "@/i18n/config";
import { contactPageUrl } from "@/ui/services/contact-page";
import { useT } from "@/ui/i18n/useT";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import { useLocale } from "next-intl";

type Props = {
	open: boolean;
	onClose: () => void;
};

/** Forgotten password of an account created with a username, which has no email to reset it by. */
export default function ForgottenPseudoPasswordDialog({
	open,
	onClose,
}: Props) {
	const t = useT("auth.forgottenPseudoPassword");
	const locale = toLocale(useLocale());

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{t("title")}</DialogTitle>
			<DialogContent>
				<DialogContentText>{t("body")}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("close")}</Button>
				<Button
					variant="contained"
					href={contactPageUrl(locale, "forgotten-password")}
					target="_blank"
					rel="noopener noreferrer"
				>
					{t("contact")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
