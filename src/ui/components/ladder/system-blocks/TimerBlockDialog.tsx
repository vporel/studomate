"use client";

import { TIMER_TYPES, TimerType } from "@/schemas/function-blocks/timer.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Button, MenuItem, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useBlockNameField } from "./useBlockNameField";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

const TIMER_TYPE_LABELS: Record<TimerType, string> = {
	TON: "TON — retard à l'enclenchement",
	TOF: "TOF — retard au déclenchement",
	TP: "TP — impulsion calibrée",
};

/**
 * Fenêtre de configuration d'un bloc tempo, en création comme en édition : ouverte par
 * `useLadderDropHandlers` au dépose depuis la section "Blocs systèmes" de l'explorateur
 * (`pendingSystemBlockCreation`, n'insère l'élément qu'à la validation), ou par double-clic sur
 * un bloc existant du canevas (`pendingSystemBlockEdit`, préremplie avec ses valeurs actuelles).
 * Les deux états sont mutuellement exclusifs (un seul bloc système géré à la fois).
 */
export default function TimerBlockDialog() {
	const { pendingCreation, pendingEdit, creating, editing, open, close, commandsStackManager } =
		useSystemBlockDialog("timer");
	const project = useProjectStore((state) => state.project);

	const [name, setName] = useState("");
	const [timerType, setTimerType] = useState<TimerType>("TON");

	useEffect(() => {
		if (pendingEdit?.blockType === "timer") {
			setName(pendingEdit.initial.name);
			setTimerType(pendingEdit.initial.timerType);
		}
	}, [pendingEdit]);

	const onClose = useCallback(() => {
		close();
		setName("");
		setTimerType("TON");
	}, [close]);

	const nameErrors = useBlockNameField(
		name,
		editing && pendingEdit?.blockType === "timer" ? pendingEdit.initial.name : undefined,
		project,
	);

	const canSubmit = name !== "" && nameErrors.length === 0;

	const onSubmit = useCallback(() => {
		if (!canSubmit) return;
		if (creating && pendingCreation?.blockType === "timer") {
			pendingCreation.insert({ name, timerType, pt: "" });
		} else if (editing && pendingEdit?.blockType === "timer") {
			commandsStackManager.executeOperation([
				new ElementUpdateCommand({
					elementId: pendingEdit.elementId,
					changes: { data: { params: { ...pendingEdit.initial, name, timerType } } },
					previousChanges: { data: { params: pendingEdit.initial } },
				}),
			]);
		}
		onClose();
	}, [
		canSubmit,
		creating,
		pendingCreation,
		editing,
		pendingEdit,
		name,
		timerType,
		commandsStackManager,
		onClose,
	]);

	return (
		<CustomModal
			open={open}
			onClose={onClose}
			title={editing ? "Modifier la temporisation" : "Nouvelle temporisation"}
			width={400}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<TextField
					label="Nom"
					autoFocus
					slotProps={{ inputLabel: { shrink: true } }}
					value={name}
					onChange={(e) => setName(e.target.value)}
					error={nameErrors.length > 0}
					helperText={nameErrors[0]}
					onKeyDown={(e) => {
						if (e.key === "Enter" && canSubmit) onSubmit();
					}}
				/>
				<TextField
					select
					label="Variante"
					value={timerType}
					onChange={(e) => setTimerType(e.target.value as TimerType)}
				>
					{TIMER_TYPES.map((type) => (
						<MenuItem key={type} value={type}>
							{TIMER_TYPE_LABELS[type]}
						</MenuItem>
					))}
				</TextField>
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
						{editing ? "Enregistrer" : "Créer"}
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
