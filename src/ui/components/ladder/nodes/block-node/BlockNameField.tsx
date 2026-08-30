"use client";

import { validateBlockName } from "@/schemas/ladder/function-blocks/function-block.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { InputBase } from "@mui/material";
import { useEffect, useRef, useState } from "react";

/**
 * Nom éditable d'un bloc tempo/compteur, affiché à la place du libellé sur la ligne structurelle.
 * Un seul champ, en permanence éditable (pas de bascule affichage/édition) : au repos il est
 * épuré, et le focus/curseur natif suffit à signaler qu'on peut taper — un clic place le caret
 * là où on a cliqué, sans code de focus.
 *
 * Tant que la saisie est invalide (`validateBlockName` ou nom déjà pris dans le projet), le texte
 * passe en rouge. Au commit (Entrée ou perte de focus), un nom vide ou invalide est ignoré et
 * l'ancien nom restauré : la valeur transmise à `onCommit` est toujours valide, et la commande de
 * modification n'est exécutée qu'à ce moment.
 */
export default function BlockNameField({
	value,
	onCommit,
}: {
	value: string;
	onCommit: (name: string) => void;
}) {
	const project = useProjectStore((state) => state.project);
	const [draft, setDraft] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);
	const cancelledRef = useRef(false);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	const changed = draft !== "" && draft !== value;
	const invalid =
		changed &&
		(validateBlockName(draft).length > 0 || !!project?.isNameTaken?.(draft));

	const commit = () => {
		if (cancelledRef.current) {
			cancelledRef.current = false;
			setDraft(value);
			return;
		}
		if (changed && !invalid) onCommit(draft);
		else setDraft(value);
	};

	return (
		<InputBase
			inputRef={inputRef}
			className="nodrag"
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onMouseDown={(e) => e.stopPropagation()}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === "Enter") inputRef.current?.blur();
				else if (e.key === "Escape") {
					cancelledRef.current = true;
					inputRef.current?.blur();
				}
				e.stopPropagation();
			}}
			inputProps={{
				"aria-label": "Nom du bloc",
				style: {
					textAlign: "center",
					padding: 0,
					textOverflow: "ellipsis",
					width: `${Math.max(draft.length, 1)}ch`,
				},
			}}
			sx={{
				maxWidth: "90%",
				fontSize: 10,
				lineHeight: 1.2,
				background: "white",
				px: "2px",
				color: invalid ? "error.main" : "text.primary",
			}}
		/>
	);
}
