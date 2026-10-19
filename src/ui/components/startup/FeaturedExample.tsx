"use client";

import Illustration3dSlot, {
	isIllustration3dId,
} from "@/ui/components/3d-illustrations/Illustration3dSlot";
import { useT } from "@/ui/i18n/useT";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { alpha, Box, Button, Card, Typography } from "@mui/material";
import { useMemo } from "react";
import type { ExampleVariant } from "./ExampleCard";
import { projectContents } from "./project-contents";
import ProjectContentsLine from "./ProjectContentsLine";
import type { StartupExample } from "./startup-examples";

export default function FeaturedExample({
	example,
	onOpen,
}: {
	example: StartupExample;
	onOpen: (variant: ExampleVariant) => void;
}) {
	const t = useT("chrome.startup");
	const tTemplates = useT("templates");
	const contents = useMemo(
		() =>
			projectContents((example.template.solution ?? example.template.create)()),
		[example],
	);

	const image = (
		<Box
			component="img"
			src={example.imageUrl}
			alt=""
			sx={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				objectFit: "cover",
			}}
		/>
	);

	return (
		<Card
			variant="outlined"
			sx={{
				display: "grid",
				gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
				borderRadius: 3,
			}}
		>
			<Box
				sx={{
					position: "relative",
					minHeight: 340,
					background: (theme) => alpha(theme.palette.primary.main, 0.06),
					borderRight: 1,
					borderColor: "divider",
				}}
			>
				{isIllustration3dId(example.id) ? (
					<Illustration3dSlot
						illustration={example.id}
						label={t(`sceneLabels.${example.id}`)}
						fallback={image}
					/>
				) : (
					image
				)}
			</Box>
			<Box
				sx={{
					p: 4,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
				}}
			>
				<Typography
					variant="overline"
					color="primary"
					fontWeight={600}
					lineHeight={1.5}
				>
					{t("featuredOverline")}
				</Typography>
				<Typography
					component="h2"
					sx={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.25, mt: 1 }}
				>
					{tTemplates(`${example.id}.label`)}
				</Typography>
				<Typography color="text.secondary" mt={1.5}>
					{t(`examples.${example.id}`)}
				</Typography>
				<ProjectContentsLine contents={contents} mt={1.5} />
				<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 4 }}>
					<Button
						variant="contained"
						size="large"
						disableElevation
						startIcon={<PlayArrowIcon />}
						onClick={() => onOpen("solution")}
					>
						{t("simulateSolution")}
					</Button>
					<Button size="large" onClick={() => onOpen("exercise")}>
						{t("doExercise")}
					</Button>
				</Box>
			</Box>
		</Card>
	);
}
