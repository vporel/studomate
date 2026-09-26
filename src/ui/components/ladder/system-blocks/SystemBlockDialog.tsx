"use client";

import {
	CounterBlockParams,
	TimerBlockParams,
} from "@/schemas/ladder/block.schema";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import CustomModal from "@/ui/components/mui/CustomModal";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { PendingSystemBlockCreation } from "@/ui/utils/ladder/ladder-system-block-drag";
import { Button, MenuItem, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useBlockNameField } from "./useBlockNameField";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

type SystemBlockDialogProps<
	P extends TimerBlockParams | CounterBlockParams,
	V extends string,
> = {
	/** `P` is the params type of this block type (the one carried by `pendingSystemBlockCreation`/`Edit`). */
	blockType: PendingSystemBlockCreation["blockType"];
	i18nNamespace: "ladderEditor.timerDialog" | "ladderEditor.counterDialog";
	variants: readonly V[];
	/** i18n key (in the dialog namespace) of each variant's label. */
	variantKeys: Record<V, string>;
	defaultVariant: V;
	/** Shows the `note` caption of the namespace below the fields. */
	showNote?: boolean;
	readVariant: (initial: P) => V;
	buildCreation: (name: string, variant: V) => P;
	applyEdit: (initial: P, name: string, variant: V) => P;
};

/**
 * Configuration window of a system block (name + variant), in creation as in edition: opened
 * by `useLadderDropHandlers` on a drop from the explorer's "System blocks" section
 * (`pendingSystemBlockCreation`, inserts the element only on validation), or by the "Configure"
 * entry of an instance's context menu (`pendingSystemBlockEdit`, prefilled with its current
 * values). On the canvas, name and variant of an existing block are edited in place (see
 * `BlockNameField` / `inlineSelect`).
 */
export default function SystemBlockDialog<
	P extends TimerBlockParams | CounterBlockParams,
	V extends string,
>({
	blockType,
	i18nNamespace,
	variants,
	variantKeys,
	defaultVariant,
	showNote,
	readVariant,
	buildCreation,
	applyEdit,
}: SystemBlockDialogProps<P, V>) {
	const {
		pendingCreation,
		pendingEdit,
		creating,
		editing,
		open,
		close,
		commandsStackManager,
	} = useSystemBlockDialog(blockType);
	const project = useProjectStore((state) => state.project);
	const t = useT(i18nNamespace);

	// `creating`/`editing` guarantee the pending state carries this block type's params.
	const insert = creating
		? (pendingCreation as unknown as { insert: (params: P) => void }).insert
		: undefined;
	const edit = editing
		? (pendingEdit as unknown as { elementId: string; initial: P })
		: undefined;

	const [name, setName] = useState("");
	const [variant, setVariant] = useState<V>(defaultVariant);

	useEffect(() => {
		if (edit) {
			setName(edit.initial.name);
			setVariant(readVariant(edit.initial));
		}
	}, [edit, readVariant]);

	const onClose = useCallback(() => {
		close();
		setName("");
		setVariant(defaultVariant);
	}, [close, defaultVariant]);

	const nameErrors = useBlockNameField(name, edit?.initial.name, project);

	const canSubmit = name !== "" && nameErrors.length === 0;

	const onSubmit = useCallback(() => {
		if (!canSubmit) return;
		if (insert) {
			insert(buildCreation(name, variant));
		} else if (edit) {
			commandsStackManager.executeOperation([
				new ElementUpdateCommand({
					elementId: edit.elementId,
					changes: { data: { params: applyEdit(edit.initial, name, variant) } },
					previousChanges: { data: { params: edit.initial } },
				}),
			]);
		}
		onClose();
	}, [
		canSubmit,
		insert,
		edit,
		name,
		variant,
		buildCreation,
		applyEdit,
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
					value={variant}
					onChange={(e) => setVariant(e.target.value as V)}
				>
					{variants.map((type) => (
						<MenuItem key={type} value={type}>
							{t(variantKeys[type] as never)}
						</MenuItem>
					))}
				</TextField>
				{showNote && (
					<Typography variant="caption" color="text.secondary">
						{t("note" as never)}
					</Typography>
				)}
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
						{editing ? t("save") : t("create")}
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
