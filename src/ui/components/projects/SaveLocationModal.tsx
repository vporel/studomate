"use client";

import { StorageLocation } from "@/persistence/repositories/project.repository";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import StorageLocationRadioGroup from "./StorageLocationRadioGroup";

export default function SaveLocationModal() {
	const { visible, onChosen } = useProjectStore(
		useShallow((s) => ({
			visible: s.ui.saveLocationModalVisible,
			onChosen: s.ui.onSaveLocationChosen,
		})),
	);
	const user = useAuthStore((s) => s.user);
	const [selected, setSelected] = useState<StorageLocation>("local");

	useEffect(() => {
		if (visible) setSelected("local");
	}, [visible]);

	const canConfirm = selected === "local" || !!user;

	return (
		<CustomModal
			open={visible}
			onClose={() => onChosen?.(null)}
			title="Où enregistrer ce projet ?"
			width={420}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Ce projet n&apos;est pas encore enregistré. Choisissez où le stocker.
				</Typography>
				<StorageLocationRadioGroup value={selected} onChange={setSelected} />
				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
					<Button onClick={() => onChosen?.(null)}>Annuler</Button>
					<Button
						variant="contained"
						onClick={() => onChosen?.(selected)}
						disabled={!canConfirm}
					>
						Enregistrer
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
