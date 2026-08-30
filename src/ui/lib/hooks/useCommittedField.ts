"use client";

import {
	ChangeEvent,
	KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";

interface UseCommittedFieldOptions<T> {
	/** Valeur canonique (le store). */
	value: T;
	/** Appelé au blur / sur Entrée quand la saisie est exploitable, acceptée et différente de
	 * `value`. C'est ici qu'on enregistre la commande. */
	onCommit: (value: T) => void;
	/** Texte saisi → valeur. `null` marque une saisie inexploitable : au blur, le champ revient à
	 * `value` sans rien commiter. Défaut : identité (pour `T = string`). */
	parse?: (text: string) => T | null;
	/** Valeur → texte affiché. Défaut : `String`. Doit être pure. */
	format?: (value: T) => string;
	/** Rejet d'une valeur pourtant bien formée (ex. doublon) : au blur, retour à `value`. */
	reject?: (value: T) => boolean;
	/** Effet à chaque frappe (aperçu live), avec la valeur parsée ou `null` si inexploitable.
	 * Rappelé avec `null` au blur, avant le commit éventuel. */
	onEdit?: (value: T | null) => void;
}

export interface CommittedField {
	/** `TextField.value`. */
	value: string;
	/** `TextField.onChange`. */
	onChange: (e: ChangeEvent<HTMLInputElement>) => void;
	/** `TextField.onBlur`. */
	onBlur: () => void;
	/** À poser sur `slotProps.htmlInput.onKeyDown` : Entrée retire le focus, ce qui déclenche
	 * `onBlur` (et donc le commit). */
	onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Champ texte à validation différée : la frappe reste locale (et peut alimenter un aperçu via
 * `onEdit`), mais la commande n'est enregistrée qu'au blur ou sur Entrée — une valeur par frappe
 * remplirait la pile d'annulation. Le champ se resynchronise sur `value` dès qu'elle change
 * ailleurs (autre édition, undo/redo).
 *
 * Une saisie en cours non validée est commitée au démontage : passer à un autre widget (le
 * panneau de propriétés est remonté par `key`) sans blurer perdrait sinon la modification, ou
 * pire la validerait plus tard contre le widget suivant via une fermeture périmée.
 */
export default function useCommittedField<T = string>({
	value,
	onCommit,
	parse,
	format,
	reject,
	onEdit,
}: UseCommittedFieldOptions<T>): CommittedField {
	const toText = format ?? ((v: T) => String(v));
	const toValue = parse ?? ((t: string) => t as unknown as T);
	const formatted = toText(value);

	const [text, setText] = useState(formatted);
	useEffect(() => setText(formatted), [formatted]);

	const commit = () => {
		const parsed = toValue(text);
		onEdit?.(null);
		if (parsed === null || reject?.(parsed)) {
			setText(formatted);
			return;
		}
		if (!Object.is(parsed, value)) onCommit(parsed);
		else setText(formatted);
	};

	const flushRef = useRef<() => void>(() => {});
	flushRef.current = () => {
		if (text !== formatted) commit();
	};
	useEffect(() => () => flushRef.current(), []);

	return {
		value: text,
		onChange: (e) => {
			setText(e.target.value);
			onEdit?.(toValue(e.target.value));
		},
		onBlur: commit,
		onKeyDown: (e) => {
			if (e.key === "Enter") e.currentTarget.blur();
		},
	};
}
