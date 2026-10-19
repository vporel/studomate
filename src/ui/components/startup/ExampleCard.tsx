"use client";

import { useT } from "@/ui/i18n/useT";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	Typography,
} from "@mui/material";
import type { StartupExample } from "./startup-examples";

export type ExampleVariant = "exercise" | "solution";

export default function ExampleCard({
	example,
	onOpen,
}: {
	example: StartupExample;
	onOpen: (variant: ExampleVariant) => void;
}) {
	const t = useT("chrome.startup");
	const tTemplates = useT("templates");

	return (
		<Card
			variant="outlined"
			sx={{ display: "flex", flexDirection: "column", borderRadius: 2 }}
		>
			<Box
				component="img"
				src={example.imageUrl}
				alt=""
				sx={{
					display: "block",
					width: "100%",
					aspectRatio: "16 / 10",
					objectFit: "cover",
					borderBottom: 1,
					borderColor: "divider",
				}}
			/>
			<CardContent sx={{ flex: 1, pb: 1 }}>
				<Typography component="h3" fontWeight={600}>
					{tTemplates(`${example.id}.label`)}
				</Typography>
				<Typography variant="body2" color="text.secondary" mt={0.5}>
					{t(`examples.${example.id}`)}
				</Typography>
			</CardContent>
			<CardActions
				disableSpacing
				sx={{ px: 2, pb: 2, gap: 1, flexWrap: "wrap" }}
			>
				<Button
					size="small"
					variant="outlined"
					onClick={() => onOpen("exercise")}
				>
					{t("doExercise")}
				</Button>
				<Button
					size="small"
					startIcon={<PlayArrowIcon />}
					onClick={() => onOpen("solution")}
				>
					{t("seeSolution")}
				</Button>
			</CardActions>
		</Card>
	);
}
