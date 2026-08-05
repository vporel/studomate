"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { exportGrafcet } from "@/ui/utils/grafcet/grafcet-export-utils";
import { exportProject } from "@/ui/utils/project/projet-export-utils";
import { Button, Divider, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectContext, useProjectStore } from "./ProjectContext";

export default function ExportModal() {
	const { exportModalVisible, setExportModalVisible, activeScope, activeScopeType } = useProjectStore(
		useShallow((s) => ({
			exportModalVisible: s.ui.exportModalVisible,
			setExportModalVisible: s.setExportModalVisible,
			activeScope: s.activeScope,
			activeScopeType: s.activeScopeType,
		})),
	);
	const grafcetsManager = useProjectStore((s) => s.grafcetsManager);
	const projectStore = useProjectContext();

	const [choice, setChoice] = useState<"grafcet" | "project" | null>(null);
	const [addDateToName, setAddDateToName] = useState<boolean>(false);

	const onClose = useCallback(() => {
		setExportModalVisible(false);
	}, [setExportModalVisible]);

	const onExport = useCallback(() => {
		const dateSuffix = addDateToName ? `-${new Date().toISOString().slice(0, 10)}` : "";
		if (choice === "project") {
			const project = projectStore?.getState().project;
			if (project) {
				const fileName = `${project.name}${dateSuffix}`;
				exportProject(project, fileName);
			}
		} else if (choice === "grafcet" && activeScopeType === "grafcet" && activeScope) {
			const grafcet = grafcetsManager.getGrafcet(activeScope);
			const fileName = `${grafcet.name}${dateSuffix}`;
			exportGrafcet(activeScope, fileName, grafcet.format);
		}
		onClose();
	}, [choice, onClose, grafcetsManager, activeScope, activeScopeType, projectStore, addDateToName]);

	return (
		<CustomModal open={exportModalVisible} onClose={onClose} title="Exporter" width={500}>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<div>
					<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<input
							type="radio"
							name="export-choice"
							value="project"
							checked={choice === "project"}
							onChange={() => setChoice("project")}
						/>
						<Typography>Exporter le projet</Typography>
					</label>
				</div>
				<div>
					<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<input
							type="radio"
							name="export-choice"
							value="grafcet"
							checked={choice === "grafcet"}
							onChange={() => setChoice("grafcet")}
							disabled={activeScopeType !== "grafcet"}
						/>
						<Typography
							sx={{
								color: activeScopeType !== "grafcet" ? "text.disabled" : "text.primary",
							}}
						>
							Exporter le grafcet actif
						</Typography>
					</label>
				</div>
				<Divider />
				<div>
					<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<input
							type="checkbox"
							checked={addDateToName}
							onChange={(e) => setAddDateToName(e.target.checked)}
						/>
						<Typography>Ajouter au nom la date</Typography>
					</label>
				</div>

				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onExport} disabled={choice === null}>
						Exporter
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
