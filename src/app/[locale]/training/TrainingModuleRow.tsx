"use client";

import { Link } from "@/i18n/navigation";
import type { PublicPathname } from "@/i18n/routing";
import TrainingProgressRepository from "@/persistence/repositories/training-progress.repository";
import { useT } from "@/ui/i18n/useT";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { Chip, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function TrainingModuleRow({
	label,
	available,
	statusLabel,
	completedLabel,
	comingSoonLabel,
	href,
	moduleId,
	stepIds,
}: {
	label: string;
	available: boolean;
	statusLabel: string;
	completedLabel: string;
	comingSoonLabel: string;
	href?: PublicPathname;
	/** Permet d'afficher la progression (reprise via compte requis, voir
	 * `TrainingProgressRepository`) — sans effet si omis (`available: false`, ou module sans
	 * suivi de progression). Ordre des étapes du module, du premier au dernier. */
	moduleId?: string;
	stepIds?: string[];
}) {
	const t = useT("training");
	const [savedStepId, setSavedStepId] = useState<string | null>(null);

	useEffect(() => {
		if (!available || !moduleId || !stepIds) return;
		let cancelled = false;
		void new TrainingProgressRepository()
			.getStepId(moduleId, stepIds)
			.then((stepId) => {
				if (!cancelled) setSavedStepId(stepId);
			});
		return () => {
			cancelled = true;
		};
	}, [available, moduleId, stepIds]);

	const currentStepNumber = stepIds && savedStepId
		? stepIds.indexOf(savedStepId) + 1
		: 0;
	const completed = !!stepIds && currentStepNumber === stepIds.length;

	const statusText = completed
		? completedLabel
		: available && stepIds
			? `${currentStepNumber}/${stepIds.length}`
			: available
				? statusLabel
				: comingSoonLabel;

	const content = (
		<Stack
			direction="row"
			alignItems="center"
			justifyContent="space-between"
			gap={1.5}
			sx={{
				py: 1.25,
				px: 1.5,
				borderRadius: 1.5,
				cursor: "pointer",
				"&:hover": { bgcolor: "action.hover" },
			}}
		>
			<Stack direction="row" alignItems="center" gap={1.5}>
				{completed ? (
					<CheckCircleIcon color="success" fontSize="small" />
				) : available ? (
					<PlayCircleIcon color="primary" fontSize="small" />
				) : (
					<ScheduleIcon color="disabled" fontSize="small" />
				)}
				<Typography fontWeight={available ? 500 : 400}>{label}</Typography>
			</Stack>
			<Chip
				size="small"
				label={statusText}
				color={completed ? "success" : "default"}
				variant={completed ? "filled" : "outlined"}
			/>
		</Stack>
	);

	if (available && href) {
		return (
			<Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
				{content}
			</Link>
		);
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => toast.info(t("comingSoonMessage"))}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") toast.info(t("comingSoonMessage"));
			}}
		>
			{content}
		</div>
	);
}
