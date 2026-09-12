"use client";

import { StorageLocation } from "@/persistence/repositories/project.repository";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import StorageLocationRadioGroup from "./StorageLocationRadioGroup";
import { useT } from "@/ui/i18n/useT";

export default function SaveLocationModal() {
	const { visible, onChosen } = useProjectStore(
		useShallow((s) => ({
			visible: s.ui.saveLocationModalVisible,
			onChosen: s.ui.onSaveLocationChosen,
		})),
	);
	const t = useT("projects.saveLocation");
	const tc = useT("projects.common");
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
			title={t("title")}
			width={420}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Typography variant="body2" color="text.secondary">
					{t("body")}
				</Typography>
				<StorageLocationRadioGroup value={selected} onChange={setSelected} />
				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
					<Button onClick={() => onChosen?.(null)}>{tc("cancel")}</Button>
					<Button
						variant="contained"
						onClick={() => onChosen?.(selected)}
						disabled={!canConfirm}
					>
						{tc("save")}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
