"use client";

import { PROJECT_TEMPLATES } from "@/templates/index";
import CustomModal from "@/ui/lib/mui/CustomModal";
import {
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Divider,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";

export default function NewProjectModal() {
	const {
		newProjectModalVisible,
		setNewProjectModalVisible,
		lifecycleManager,
	} = useProjectStore(
		useShallow((s) => ({
			newProjectModalVisible: s.ui.newProjectModalVisible,
			setNewProjectModalVisible: s.setNewProjectModalVisible,
			lifecycleManager: s.lifecycleManager,
		})),
	);

	const [selected, setSelected] = useState<string | null>(null);

	const onClose = () => {
		setNewProjectModalVisible(false);
		setSelected(null);
	};

	const onConfirm = (variant: "exercise" | "solution" = "exercise") => {
		void lifecycleManager.newProjectFromTemplate(selected, variant);
		setSelected(null);
	};

	return (
		<CustomModal
			open={newProjectModalVisible}
			onClose={onClose}
			title="Nouveau projet"
			width={960}
			sx={{ maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
		>
			<Box display="flex" flexDirection="column" gap={2}>
				<Typography variant="body2" color="text.secondary">
					{`Choisissez un point de départ pour votre projet.`}
				</Typography>

				{/* Projet vide */}
				<Card
					variant="outlined"
					sx={{
						borderColor: selected === null ? "primary.main" : "divider",
						cursor: "pointer",
					}}
				>
					<CardActionArea onClick={() => setSelected(null)}>
						<CardContent>
							<Typography
								variant="subtitle1"
								fontWeight={600}
							>{`Projet vide`}</Typography>
							<Typography variant="body2" color="text.secondary">
								{`Démarre avec un projet sans variable ni interface HMI.`}
							</Typography>
						</CardContent>
					</CardActionArea>
				</Card>

				{PROJECT_TEMPLATES.length > 0 && (
					<>
						<Divider>
							<Typography variant="caption" color="text.secondary">
								{`Maquettes`}
							</Typography>
						</Divider>

						<Box
							display="grid"
							gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
							gap={2}
							sx={{ maxHeight: 440, overflowY: "auto", pr: 1 }}
						>
							{PROJECT_TEMPLATES.map((template) => (
								<Card
									key={template.id}
									variant="outlined"
									sx={{
										height: "100%",
										borderColor:
											selected === template.id ? "primary.main" : "divider",
										cursor: "pointer",
									}}
								>
									<CardActionArea
										onClick={() => setSelected(template.id)}
										sx={{
											height: "100%",
											display: "flex",
											alignItems: "stretch",
										}}
									>
										<CardContent>
											<Typography variant="subtitle1" fontWeight={600}>
												{template.label}
											</Typography>
											<Typography variant="body2" color="text.secondary">
												{template.description}
											</Typography>
											{template.solution && (
												<Typography
													variant="caption"
													color="text.secondary"
													sx={{
														fontStyle: "italic",
														display: "block",
														mt: 0.5,
													}}
												>
													{`Une solution est disponible.`}
												</Typography>
											)}
										</CardContent>
									</CardActionArea>
								</Card>
							))}
						</Box>
					</>
				)}

				<Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
					<Button variant="outlined" onClick={onClose}>
						{`Annuler`}
					</Button>
					{selected !== null &&
						PROJECT_TEMPLATES.find((t) => t.id === selected)?.solution && (
							<Button variant="outlined" onClick={() => onConfirm("solution")}>
								{`Ouvrir la solution`}
							</Button>
						)}
					<Button variant="contained" onClick={() => onConfirm("exercise")}>
						{`Créer`}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
