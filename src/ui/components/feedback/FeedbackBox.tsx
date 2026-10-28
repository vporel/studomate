"use client";

import { FEEDBACK_COMMENT_MAX_LENGTH } from "@/feedback/feedback-prompt";
import { useT } from "@/ui/i18n/useT";
import trackEvent from "@/ui/services/analytics";
import {
	completeFeedbackPrompt,
	postponeFeedbackPrompt,
} from "@/ui/services/feedback-prompt";
import sendFeedback from "@/ui/services/send-feedback";
import {
	feedbackStore,
	useFeedbackStore,
	type FeedbackBoxSource,
} from "@/ui/stores/feedback/feedback.store";
import {
	Box,
	Button,
	CircularProgress,
	Paper,
	Rating,
	TextField,
	Typography,
} from "@mui/material";
import { useLocale } from "next-intl";
import { useState } from "react";
import { toast } from "react-toastify";

function FeedbackForm({ source }: { source: FeedbackBoxSource }) {
	const t = useT("feedback");
	const locale = useLocale();
	const [rating, setRating] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [sending, setSending] = useState(false);

	const submit = async () => {
		if (rating === null) return;
		setSending(true);
		const sent = await sendFeedback({
			rating,
			comment,
			locale: locale === "en" ? "en" : "fr",
		});
		setSending(false);
		if (!sent) {
			toast.error(t("error"));
			return;
		}
		trackEvent("feedback-sent", { rating, source });
		toast.success(t("thanks"));
		completeFeedbackPrompt();
	};

	const dismiss = () =>
		source === "prompt"
			? postponeFeedbackPrompt()
			: feedbackStore.getState().close();

	return (
		<Paper
			role="dialog"
			aria-labelledby="feedback-box-title"
			elevation={8}
			sx={{
				position: "fixed",
				left: 16,
				bottom: 48,
				width: 340,
				maxWidth: "calc(100vw - 32px)",
				p: 2,
				zIndex: (theme) => theme.zIndex.snackbar,
			}}
		>
			<Typography id="feedback-box-title" fontWeight={700} mb={0.5}>
				{t("title")}
			</Typography>
			<Typography variant="body2" color="text.secondary" mb={1.5}>
				{t("intro")}
			</Typography>
			<Typography component="legend" variant="caption" color="text.secondary">
				{t("ratingLabel")}
			</Typography>
			<Rating
				name="feedback-rating"
				size="large"
				value={rating}
				onChange={(_, value) => setRating(value)}
				getLabelText={(count) => t("ratingValue", { count })}
				disabled={sending}
			/>
			<TextField
				value={comment}
				onChange={(e) => setComment(e.target.value)}
				label={t("commentLabel")}
				placeholder={t("commentPlaceholder")}
				multiline
				minRows={3}
				maxRows={6}
				fullWidth
				size="small"
				disabled={sending}
				slotProps={{
					inputLabel: { shrink: true },
					htmlInput: { maxLength: FEEDBACK_COMMENT_MAX_LENGTH },
				}}
				sx={{ mt: 1.5 }}
			/>
			<Box
				sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5 }}
			>
				<Button
					size="small"
					color="inherit"
					onClick={dismiss}
					disabled={sending}
				>
					{source === "prompt" ? t("later") : t("cancel")}
				</Button>
				<Button
					size="small"
					variant="contained"
					disableElevation
					startIcon={
						sending ? <CircularProgress size={14} color="inherit" /> : undefined
					}
					onClick={() => void submit()}
					disabled={rating === null || sending}
				>
					{sending ? t("sending") : t("send")}
				</Button>
			</Box>
		</Paper>
	);
}

export default function FeedbackBox() {
	const source = useFeedbackStore((state) => state.source);
	return source ? <FeedbackForm source={source} /> : null;
}
