"use client";

import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Button, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

/**
 * Fenêtre de configuration d'un bloc compare, en création comme en édition — même mécanisme que
 * `TimerBlockDialog`/`CounterBlockDialog`, mais un seul champ (l'expression) : le bloc n'a pas de
 * nom (voir `CompareBlockParams`), donc pas de validation d'unicité ni de variante à choisir. Vide
 * autorisé à la création — c'est `CompareBlockAnalyser` qui signale une expression manquante,
 * comme PT/PV le sont pour un timer/compteur plutôt que bloqués ici.
 */
export default function CompareBlockDialog() {
	const { pendingCreation, pendingEdit, creating, editing, open, close, commandsStackManager } =
		useSystemBlockDialog("compare");

	const [expression, setExpression] = useState("");

	useEffect(() => {
		if (pendingEdit?.blockType === "compare") setExpression(pendingEdit.initial.expression);
	}, [pendingEdit]);

	const onClose = useCallback(() => {
		close();
		setExpression("");
	}, [close]);

	const onSubmit = useCallback(() => {
		if (creating && pendingCreation?.blockType === "compare") {
			pendingCreation.insert({ expression });
		} else if (editing && pendingEdit?.blockType === "compare") {
			commandsStackManager.executeOperation([
				new ElementUpdateCommand({
					elementId: pendingEdit.elementId,
					changes: { data: { params: { expression } } },
					previousChanges: { data: { params: pendingEdit.initial } },
				}),
			]);
		}
		onClose();
	}, [creating, pendingCreation, editing, pendingEdit, expression, commandsStackManager, onClose]);

	return (
		<CustomModal
			open={open}
			onClose={onClose}
			title={editing ? "Modifier la comparaison" : "Nouvelle comparaison"}
			width={400}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<TextField
					label="Expression"
					autoFocus
					slotProps={{ inputLabel: { shrink: true } }}
					value={expression}
					onChange={(e) => setExpression(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") onSubmit();
					}}
				/>
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onSubmit}>
						{editing ? "Enregistrer" : "Créer"}
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
