"use client";

import { COUNTER_TYPES, CounterType } from "@/schemas/function-blocks/counter.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Button, MenuItem, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useBlockNameField } from "./useBlockNameField";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

const COUNTER_TYPE_LABELS: Record<CounterType, string> = {
	CTU: "CTU — compte vers le haut",
	CTD: "CTD — compte vers le bas",
};

/**
 * Fenêtre de configuration d'un bloc compteur, en création comme en édition — même mécanisme que
 * `TimerBlockDialog` : ouverte par `useLadderDropHandlers` au dépose depuis la section "Blocs
 * systèmes" de l'explorateur (`pendingSystemBlockCreation`, n'insère l'élément qu'à la
 * validation), ou par double-clic/menu contextuel sur un bloc existant du canevas
 * (`pendingSystemBlockEdit`, préremplie avec ses valeurs actuelles). Ne gère que `name`/
 * `counterType` : le contrôle (R/LD), PV et CV s'éditent directement sur le nœud du canevas
 * (voir `ParamPinRow`), comme PT/ET pour un timer.
 */
export default function CounterBlockDialog() {
	const { pendingCreation, pendingEdit, creating, editing, open, close, commandsStackManager } =
		useSystemBlockDialog("counter");
	const project = useProjectStore((state) => state.project);

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
		editing && pendingEdit?.blockType === "counter" ? pendingEdit.initial.name : undefined,
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
					changes: { data: { params: { ...pendingEdit.initial, name, counterType } } },
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
			title={editing ? "Modifier le compteur" : "Nouveau compteur"}
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
					value={counterType}
					onChange={(e) => setCounterType(e.target.value as CounterType)}
				>
					{COUNTER_TYPES.map((type) => (
						<MenuItem key={type} value={type}>
							{COUNTER_TYPE_LABELS[type]}
						</MenuItem>
					))}
				</TextField>
				<Typography variant="caption" color="text.secondary">
					Contrairement à une temporisation, ce compteur évalue son entrée à chaque cycle (pas de
					détection de front) : il compte tant que celle-ci reste vraie, sans stopper à la valeur de
					consigne.
				</Typography>
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
						{editing ? "Enregistrer" : "Créer"}
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
