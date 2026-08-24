"use client";

import { validateBlockName } from "@/schemas/function-blocks/function-block.schema";
import { TIMER_TYPES, TimerType } from "@/schemas/function-blocks/timer.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Button, MenuItem, TextField } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

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
	const pendingCreation = useLadderStore((state) => state.pendingSystemBlockCreation);
	const setPendingSystemBlockCreation = useLadderStore((state) => state.setPendingSystemBlockCreation);
	const pendingEdit = useLadderStore((state) => state.pendingSystemBlockEdit);
	const setPendingSystemBlockEdit = useLadderStore((state) => state.setPendingSystemBlockEdit);
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);
	const project = useProjectStore((state) => state.project);

	const [name, setName] = useState("");
	const [timerType, setTimerType] = useState<TimerType>("TON");

	const creating = pendingCreation?.blockType === "timer";
	const editing = pendingEdit?.blockType === "timer";
	const open = creating || editing;

	useEffect(() => {
		if (pendingEdit?.blockType === "timer") {
			setName(pendingEdit.initial.name);
			setTimerType(pendingEdit.initial.timerType);
		}
	}, [pendingEdit]);

	const onClose = useCallback(() => {
		setPendingSystemBlockCreation(null);
		setPendingSystemBlockEdit(null);
		setName("");
		setTimerType("TON");
	}, [setPendingSystemBlockCreation, setPendingSystemBlockEdit]);

	const nameErrors = useMemo(() => {
		if (name === "") return [];
		// En édition, le nom courant du bloc occupe déjà cet emplacement dans l'espace de noms —
		// ce n'est un conflit que s'il coïncide avec une *autre* variable/bloc.
		if (editing && name === pendingEdit.initial.name) return [];
		const errors = validateBlockName(name);
		if (errors.length === 0 && project?.isNameTaken(name)) {
			errors.push("Ce nom est déjà utilisé par une variable ou un autre bloc du projet.");
		}
		return errors;
	}, [name, project, editing, pendingEdit]);

	const canSubmit = name !== "" && nameErrors.length === 0;

	const onSubmit = useCallback(() => {
		if (!canSubmit) return;
		if (creating && pendingCreation) {
			pendingCreation.insert({ name, timerType, pt: "" });
		} else if (editing && pendingEdit) {
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
