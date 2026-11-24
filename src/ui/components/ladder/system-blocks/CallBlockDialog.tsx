"use client";

import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import CustomModal from "@/ui/components/mui/CustomModal";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { Button, MenuItem, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

/**
 * Window opened by dropping the CALL tool on the canvas: picks the ladder the new call block
 * references, which cannot be changed afterwards.
 */
export default function CallBlockDialog() {
	const { pendingCreation, open, close } = useSystemBlockDialog("user-program");
	const project = useProjectStore((state) => (open ? state.project : null));
	const ladderId = useLadderStore((state) => state.ladder.id);
	const t = useT("ladderEditor.callDialog");
	const [selectedId, setSelectedId] = useState("");

	const caller = project?.getLadder(ladderId);
	const refusals = caller
		? Object.values(project?.ladders ?? {}).map((ladder) => ({
				ladder,
				refusal: ladder.getCallRefusalFrom(caller),
			}))
		: [];
	const callable = refusals
		.filter(({ refusal }) => !refusal)
		.map(({ ladder }) => ladder);
	const onlyExcludedLeft = refusals.some(
		({ refusal }) => refusal === "excluded",
	);
	const programId = callable.some((ladder) => ladder.id === selectedId)
		? selectedId
		: (callable[0]?.id ?? "");

	const onClose = () => {
		close();
		setSelectedId("");
	};

	const onSubmit = () => {
		if (pendingCreation?.blockType !== "user-program" || !programId) return;
		pendingCreation.insert({ programId });
		onClose();
	};

	return (
		<CustomModal open={open} onClose={onClose} title={t("title")} width={400}>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				{callable.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						{t(onlyExcludedLeft ? "noProgramExcludedOnly" : "noProgram")}
					</Typography>
				) : (
					<>
						<TextField
							select
							autoFocus
							label={t("program")}
							slotProps={{ inputLabel: { shrink: true } }}
							value={programId}
							onChange={(e) => setSelectedId(e.target.value)}
						>
							{callable.map((ladder) => (
								<MenuItem key={ladder.id} value={ladder.id}>
									{ladder.name}
								</MenuItem>
							))}
						</TextField>
						<div style={{ display: "flex", justifyContent: "flex-end" }}>
							<Button variant="contained" onClick={onSubmit}>
								{t("create")}
							</Button>
						</div>
					</>
				)}
			</div>
		</CustomModal>
	);
}
