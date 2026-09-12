"use client";

import { TIMER_TYPES, TimerType } from "@/schemas/ladder/function-blocks/timer.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { useT } from "@/ui/i18n/useT";
import { Button, MenuItem, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useBlockNameField } from "./useBlockNameField";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

const TIMER_TYPE_KEYS: Record<TimerType, string> = {
	TON: "typeTON",
	TOF: "typeTOF",
	TP: "typeTP",
};

/**
 * Fenêtre de configuration d'un bloc tempo, en création comme en édition : ouverte par
 * `useLadderDropHandlers` au dépose depuis la section "Blocs systèmes" de l'explorateur
 * (`pendingSystemBlockCreation`, n'insère l'élément qu'à la validation), ou par l'entrée
 * "Paramétrer" du menu contextuel d'une instance dans l'explorateur (`pendingSystemBlockEdit`,
 * préremplie avec ses valeurs actuelles). Sur le canevas, nom et variante d'un bloc existant
 * s'éditent en place (voir `BlockNameField` / `inlineSelect`). Les deux états sont mutuellement
 * exclusifs (un seul bloc système géré à la fois).
 */
export default function TimerBlockDialog() {
	const {
		pendingCreation,
		pendingEdit,
		creating,
		editing,
		open,
		close,
		commandsStackManager,
	} = useSystemBlockDialog("timer");
	const project = useProjectStore((state) => state.project);
	const t = useT("ladderEditor.timerDialog");

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
		editing && pendingEdit?.blockType === "timer"
			? pendingEdit.initial.name
			: undefined,
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
					changes: {
						data: { params: { ...pendingEdit.initial, name, timerType } },
					},
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
			title={editing ? t("editTitle") : t("createTitle")}
			width={400}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<TextField
					label={t("name")}
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
					label={t("variant")}
					value={timerType}
					onChange={(e) => setTimerType(e.target.value as TimerType)}
				>
					{TIMER_TYPES.map((type) => (
						<MenuItem key={type} value={type}>
							{t(TIMER_TYPE_KEYS[type] as never)}
						</MenuItem>
					))}
				</TextField>
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
						{editing ? t("save") : t("create")}
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
