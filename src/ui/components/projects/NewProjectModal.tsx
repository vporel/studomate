"use client";

import { PROJECT_TEMPLATES } from "@/templates/index";
import { useT } from "@/ui/i18n/useT";
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
	const tTemplates = useT("templates");
	const t = useT("projects.new");
	const tc = useT("projects.common");

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
			title={t("title")}
			width={960}
			sx={{ maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}
		>
			<Box display="flex" flexDirection="column" gap={2}>
				<Typography variant="body2" color="text.secondary">
					{t("chooseStartingPoint")}
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
							>{t("emptyProject")}</Typography>
							<Typography variant="body2" color="text.secondary">
								{t("emptyProjectDescription")}
							</Typography>
						</CardContent>
					</CardActionArea>
				</Card>

				{PROJECT_TEMPLATES.length > 0 && (
					<>
						<Divider>
							<Typography variant="caption" color="text.secondary">
								{t("templates")}
							</Typography>
						</Divider>

						<Box
							sx={{ minHeight: 0, maxHeight: 440, overflowY: "auto", pr: 1 }}
						>
							<Box
								display="grid"
								gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
								gap={2}
							>
								{PROJECT_TEMPLATES.map((template) => (
									<Card
										key={template.id}
										variant="outlined"
										sx={{
											height: "100%",
											borderColor:
												selected === template.id
													? "primary.main"
													: "divider",
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
													{tTemplates(`${template.id}.label`)}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													{tTemplates(`${template.id}.description`)}
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
														{t("solutionAvailable")}
													</Typography>
												)}
											</CardContent>
										</CardActionArea>
									</Card>
								))}
							</Box>
						</Box>
					</>
				)}

				<Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
					<Button variant="outlined" onClick={onClose}>
						{tc("cancel")}
					</Button>
					{selected !== null &&
						PROJECT_TEMPLATES.find((tpl) => tpl.id === selected)?.solution && (
							<Button variant="outlined" onClick={() => onConfirm("solution")}>
								{t("openSolution")}
							</Button>
						)}
					<Button variant="contained" onClick={() => onConfirm("exercise")}>
						{t("create")}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
