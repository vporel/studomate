"use client";

import type { SceneDescriptor } from "@/3d-scenes/scene.descriptor";
import { useT } from "@/ui/i18n/useT";
import CustomModal from "@/ui/components/mui/CustomModal";
import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	CardMedia,
	Typography,
} from "@mui/material";

type Props = {
	open: boolean;
	onClose: () => void;
	scenes: readonly SceneDescriptor[];
	/** Id of the scene currently attached to the project; `null` for none. */
	currentSceneId: string | null;
	/** Called with the chosen scene, or `null` for "no scene". */
	onChoose: (scene: SceneDescriptor | null) => void;
};

export default function SceneChoiceModal({
	open,
	onClose,
	scenes,
	currentSceneId,
	onChoose,
}: Props) {
	const t = useT("pages.scene3d");
	const ts = useT("scene3d");

	const cardSx = (selected: boolean) => ({
		height: "100%",
		borderColor: selected ? "primary.main" : "divider",
		borderWidth: selected ? 2 : 1,
	});
	const actionSx = {
		height: "100%",
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
		justifyContent: "flex-start",
	} as const;

	return (
		<CustomModal
			open={open}
			onClose={onClose}
			title={t("chooseScene")}
			width={960}
			sx={{ maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
		>
			<Box
				display="grid"
				gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
				gap={2}
			>
				<Card variant="outlined" sx={cardSx(currentSceneId === null)}>
					<CardActionArea sx={actionSx} onClick={() => onChoose(null)}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600}>
								{t("sceneNone")}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{t("sceneNoneDescription")}
							</Typography>
						</CardContent>
					</CardActionArea>
				</Card>
				{scenes.map((scene) => (
					<Card
						key={scene.id}
						variant="outlined"
						sx={cardSx(currentSceneId === scene.id)}
					>
						<CardActionArea sx={actionSx} onClick={() => onChoose(scene)}>
							<CardMedia
								component="img"
								loading="lazy"
								image={scene.imageUrl}
								alt={t("sceneImageAlt", {
									scene: ts(scene.labelKey as never),
								})}
								sx={{ height: 160, objectFit: "contain", bgcolor: "#eef1f3" }}
							/>
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600}>
									{ts(scene.labelKey as never)}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{ts(scene.descriptionKey as never)}
								</Typography>
							</CardContent>
						</CardActionArea>
					</Card>
				))}
			</Box>
		</CustomModal>
	);
}
