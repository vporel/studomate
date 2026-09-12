"use client";

import {
	COUNTER_TYPES,
	CounterType,
} from "@/schemas/ladder/function-blocks/counter.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { useT } from "@/ui/i18n/useT";
import { Button, MenuItem, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useBlockNameField } from "./useBlockNameField";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

const COUNTER_TYPE_KEYS: Record<CounterType, string> = {
	CTU: "typeCTU",
	CTD: "typeCTD",
};

/**
 * Fenêtre de configuration d'un bloc compteur, en création comme en édition — même mécanisme que
 * `TimerBlockDialog` : ouverte par `useLadderDropHandlers` au dépose depuis la section "Blocs
 * systèmes" de l'explorateur (`pendingSystemBlockCreation`, n'insère l'élément qu'à la
 * validation), ou par l'entrée "Paramétrer" du menu contextuel d'une instance dans l'explorateur
 * (`pendingSystemBlockEdit`, préremplie avec ses valeurs actuelles). Ne gère que `name`/
 * `counterType` : sur le canevas, ces deux-là s'éditent en place (voir `BlockNameField` /
 * `inlineSelect`), et le contrôle (R/LD), PV et CV directement sur le nœud (voir `ParamPinRow`),
 * comme PT/ET pour un timer.
 */
export default function CounterBlockDialog() {
	const {
		pendingCreation,
		pendingEdit,
		creating,
		editing,
		open,
		close,
		commandsStackManager,
	} = useSystemBlockDialog("counter");
	const project = useProjectStore((state) => state.project);
	const t = useT("ladderEditor.counterDialog");

	const [name, setName] = useState("");
	const [counterType, setCounterType] = useState<CounterType>("CTU");

	useEffect(() => {
		if (pendingEdit?.blockType === "counter") {
			setName(pendingEdit.initial.name);
			setCounterType(pendingEdit.initial.counterType);
		}
	}, [pendingEdit]);

	const onClose = useCallback(() => {
		close();
		setName("");
		setCounterType("CTU");
	}, [close]);

	const nameErrors = useBlockNameField(
		name,
		editing && pendingEdit?.blockType === "counter"
			? pendingEdit.initial.name
			: undefined,
		project,
	);

	const canSubmit = name !== "" && nameErrors.length === 0;

	const onSubmit = useCallback(() => {
		if (!canSubmit) return;
		if (creating && pendingCreation?.blockType === "counter") {
			pendingCreation.insert({ name, counterType, control: "", pv: "" });
		} else if (editing && pendingEdit?.blockType === "counter") {
			commandsStackManager.executeOperation([
				new ElementUpdateCommand({
					elementId: pendingEdit.elementId,
					changes: {
						data: { params: { ...pendingEdit.initial, name, counterType } },
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
		counterType,
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
					value={counterType}
					onChange={(e) => setCounterType(e.target.value as CounterType)}
				>
					{COUNTER_TYPES.map((type) => (
						<MenuItem key={type} value={type}>
							{t(COUNTER_TYPE_KEYS[type] as never)}
						</MenuItem>
					))}
				</TextField>
				<Typography variant="caption" color="text.secondary">
					{t("note")}
				</Typography>
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
						{editing ? t("save") : t("create")}
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
