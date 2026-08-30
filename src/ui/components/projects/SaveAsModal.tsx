"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { Button, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";

export default function SaveAsModal() {
	const {
		saveAsModalVisible,
		setSaveAsModalVisible,
		lifecycleManager,
		project,
	} = useProjectStore(
		useShallow((s) => ({
			saveAsModalVisible: s.ui.saveAsModalVisible,
			setSaveAsModalVisible: s.setSaveAsModalVisible,
			lifecycleManager: s.lifecycleManager,
			project: s.project,
		})),
	);

	const [name, setName] = useState("");

	useEffect(() => {
		if (saveAsModalVisible) setName(project?.name ?? "");
	}, [saveAsModalVisible, project?.name]);

	const onClose = useCallback(() => {
		setSaveAsModalVisible(false);
	}, [setSaveAsModalVisible]);

	const canSubmit = name.trim() !== "";

	const onSubmit = useCallback(async () => {
		if (!canSubmit) return;
		const ok = await lifecycleManager.saveProjectAs(name.trim());
		if (ok) onClose();
	}, [canSubmit, lifecycleManager, name, onClose]);

	return (
		<CustomModal
			open={saveAsModalVisible}
			onClose={onClose}
			title="Enregistrer sous"
			width={400}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<TextField
					label="Nom du projet"
					autoFocus
					slotProps={{ inputLabel: { shrink: true } }}
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && canSubmit) void onSubmit();
					}}
					fullWidth
				/>
				<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
					<Button variant="outlined" onClick={onClose}>
						Annuler
					</Button>
					<Button
						variant="contained"
						onClick={() => void onSubmit()}
						disabled={!canSubmit}
					>
						Enregistrer
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
