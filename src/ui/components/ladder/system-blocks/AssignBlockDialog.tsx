"use client";

import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Button, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

/**
 * Fenêtre de configuration d'un bloc assign, en création comme en édition — même mécanisme que
 * `CompareBlockDialog` : un seul champ (l'expression), pas de nom, vide autorisé à la création
 * (`AssignBlockAnalyser` signale une expression manquante plutôt que bloquée ici).
 */
export default function AssignBlockDialog() {
	const { pendingCreation, pendingEdit, creating, editing, open, close, commandsStackManager } =
		useSystemBlockDialog("assign");

	const [expression, setExpression] = useState("");

	useEffect(() => {
		if (pendingEdit?.blockType === "assign") setExpression(pendingEdit.initial.expression);
	}, [pendingEdit]);

	const onClose = useCallback(() => {
		close();
		setExpression("");
	}, [close]);

	const onSubmit = useCallback(() => {
		if (creating && pendingCreation?.blockType === "assign") {
			pendingCreation.insert({ expression });
		} else if (editing && pendingEdit?.blockType === "assign") {
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
			title={editing ? "Modifier l'affectation" : "Nouvelle affectation"}
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
