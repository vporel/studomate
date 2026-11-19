"use client";

import { APP_CONTACT_EMAIL } from "@/app-info";
import {
	CONTACT_MESSAGE_MAX_LENGTH,
	CONTACT_MESSAGE_MIN_LENGTH,
	CONTACT_NAME_MAX_LENGTH,
	CONTACT_TOPICS,
	hasContactTemplate,
	isValidContactEmail,
	type ContactTopic,
} from "@/contact/contact-message";
import { useT } from "@/ui/i18n/useT";
import { Alert, Box, Button, MenuItem, TextField } from "@mui/material";
import { useLocale } from "next-intl";
import { useState, type FormEvent } from "react";

type SendError = "invalid" | "rate-limited" | "failed";
type Status = "editing" | "sending" | "sent";

type MessageProblem = "messageTooShort" | "messageUnchanged" | "pseudoMissing";

/** True when a line of `message` starts with `label` and has text after it. */
function hasFilledLine(message: string, label: string): boolean {
	return message
		.split("\n")
		.some(
			(line) =>
				line.trim().startsWith(label) &&
				line.trim().slice(label.length).trim() !== "",
		);
}

function responseError(status: number): SendError {
	if (status === 400) return "invalid";
	if (status === 429) return "rate-limited";
	return "failed";
}

/** `initialTopic` preselects the topic and, for some topics, starts the message from a template. */
export default function ContactForm({
	initialTopic,
}: {
	initialTopic: ContactTopic | null;
}) {
	const t = useT("public.contact.form");
	const locale = useLocale();
	const templateOf = (topic: ContactTopic) =>
		hasContactTemplate(topic) ? t(`templates.${topic}`) : "";

	const [topic, setTopic] = useState<ContactTopic>(initialTopic ?? "question");
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [message, setMessage] = useState(() => templateOf(topic));
	const [website, setWebsite] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [status, setStatus] = useState<Status>("editing");
	const [error, setError] = useState<SendError | null>(null);

	const emailInvalid = !isValidContactEmail(email.trim());
	// The template ends with the line to complete, e.g. "Mon pseudo : ".
	const pseudoLabel =
		templateOf("forgotten-password").split("\n").at(-1)?.trim() ?? "";
	const messageProblem = ((): MessageProblem | null => {
		if (message.trim().length < CONTACT_MESSAGE_MIN_LENGTH)
			return "messageTooShort";
		if (topic === "forgotten-password" && !hasFilledLine(message, pseudoLabel))
			return "pseudoMissing";
		if (
			hasContactTemplate(topic) &&
			message.trim() === templateOf(topic).trim()
		)
			return "messageUnchanged";
		return null;
	})();

	const changeTopic = (next: ContactTopic) => {
		// A message still equal to the previous template was not written by the visitor.
		if (message.trim() === "" || message === templateOf(topic)) {
			setMessage(templateOf(next));
		}
		setTopic(next);
	};

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setSubmitted(true);
		if (emailInvalid || messageProblem) return;
		setStatus("sending");
		setError(null);
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					topic,
					email,
					name,
					message,
					locale,
					website,
					userAgent: topic === "problem" ? navigator.userAgent : undefined,
				}),
			});
			if (response.ok) {
				setStatus("sent");
				return;
			}
			setError(responseError(response.status));
		} catch {
			setError("failed");
		}
		setStatus("editing");
	};

	const writeAnother = () => {
		setTopic("question");
		setMessage("");
		setWebsite("");
		setSubmitted(false);
		setStatus("editing");
	};

	if (status === "sent") {
		return (
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Alert severity="success">{t("sent")}</Alert>
				<Box>
					<Button onClick={writeAnother}>{t("writeAnother")}</Button>
				</Box>
			</Box>
		);
	}

	return (
		<Box
			component="form"
			noValidate
			onSubmit={(event: FormEvent) => void submit(event)}
			sx={{ display: "flex", flexDirection: "column", gap: 2 }}
		>
			<TextField
				select
				label={t("topic")}
				value={topic}
				onChange={(e) => changeTopic(e.target.value as ContactTopic)}
			>
				{CONTACT_TOPICS.map((id) => (
					<MenuItem key={id} value={id}>
						{t(`topics.${id}`)}
					</MenuItem>
				))}
			</TextField>
			<TextField
				label={t("email")}
				type="email"
				autoComplete="email"
				required
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				error={submitted && emailInvalid}
				helperText={
					submitted && emailInvalid ? t("emailInvalid") : t("emailHelper")
				}
			/>
			<TextField
				label={t("name")}
				autoComplete="name"
				value={name}
				onChange={(e) => setName(e.target.value)}
				slotProps={{ htmlInput: { maxLength: CONTACT_NAME_MAX_LENGTH } }}
			/>
			<TextField
				label={t("message")}
				required
				multiline
				minRows={6}
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				error={submitted && messageProblem !== null}
				helperText={
					submitted && messageProblem
						? t(messageProblem, {
								min: CONTACT_MESSAGE_MIN_LENGTH,
								label: pseudoLabel,
							})
						: undefined
				}
				slotProps={{ htmlInput: { maxLength: CONTACT_MESSAGE_MAX_LENGTH } }}
			/>
			<Box
				aria-hidden
				sx={{ position: "absolute", left: "-10000px", width: 1, height: 1 }}
			>
				<TextField
					label={t("honeypot")}
					name="website"
					tabIndex={-1}
					autoComplete="off"
					value={website}
					onChange={(e) => setWebsite(e.target.value)}
				/>
			</Box>
			{topic === "problem" && (
				<Alert severity="info">{t("userAgentNote")}</Alert>
			)}
			{error && (
				<Alert severity="error">
					{t.rich(`errors.${error}`, {
						email: () => (
							<a href={`mailto:${APP_CONTACT_EMAIL}`}>{APP_CONTACT_EMAIL}</a>
						),
					})}
				</Alert>
			)}
			<Box>
				<Button
					type="submit"
					variant="contained"
					disabled={status === "sending"}
				>
					{status === "sending" ? t("sending") : t("submit")}
				</Button>
			</Box>
		</Box>
	);
}
