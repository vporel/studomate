"use client";

import { buildModuleSteps } from "@/app/[locale]/training/training-modules";
import trainingStepPath from "@/app/[locale]/training/training-paths";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Box, Button, Paper, Typography } from "@mui/material";
import type { TrainingResume, TrainingStepPosition } from "./training-resume";

export default function ContinueTraining({
	resume,
}: {
	resume: TrainingResume;
}) {
	const t = useT("chrome.startup");
	const tTraining = useT("training");
	const { locale } = useLocaleContext();

	const stepTitle = (position: TrainingStepPosition) =>
		buildModuleSteps(position.moduleId, locale).find(
			(step) => step.id === position.stepId,
		)?.title ?? position.stepId;

	return (
		<Box component="section" mt={5}>
			<Typography
				component="h2"
				variant="overline"
				color="text.secondary"
				sx={{ display: "block", mb: 1 }}
			>
				{t("continueTraining")}
			</Typography>
			<Paper
				variant="outlined"
				sx={{
					borderRadius: 2,
					py: 2,
					px: 2.5,
					display: "flex",
					alignItems: "center",
					gap: 2,
				}}
			>
				<SchoolOutlinedIcon color="primary" />
				<Box sx={{ flex: 1, minWidth: 0 }}>
					{resume.completed && (
						<Typography variant="caption" color="success.main" component="p">
							{t("trainingCompleted", {
								module: tTraining(`${resume.completed.moduleId}PageTitle`),
								step: stepTitle(resume.completed),
								current: resume.completed.stepIndex + 1,
								total: resume.completed.stepCount,
							})}
						</Typography>
					)}
					<Typography fontWeight={600}>
						{tTraining(`${resume.moduleId}PageTitle`)}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						{resume.nextModule
							? t("trainingNextModule")
							: t("trainingStep", {
									current: resume.stepIndex + 1,
									total: resume.stepCount,
									step: stepTitle(resume),
								})}
					</Typography>
				</Box>
				<Button
					variant="outlined"
					href={trainingStepPath(
						locale,
						resume.moduleId,
						resume.stepId,
						resume.stepIndex,
					)}
					target="_blank"
					rel="noopener"
				>
					{resume.nextModule ? t("trainingStart") : t("trainingResume")}
				</Button>
			</Paper>
		</Box>
	);
}
