"use client";

import { range } from "@/lib/array";
import { RefObject } from "react";

type StepNumberInputProps = {
	inputRef: RefObject<HTMLInputElement | null>;
	className: string;
	value: string;
	editing: boolean;
	onChange: (value: string) => void;
	onCommit: () => void;
};

/** Champ texte restreint aux chiffres par `keydown` (`type="number"` pose problème à l'export
 * image des nœuds). La sauvegarde n'a lieu qu'au `blur`, pour éviter les sauvegardes multiples
 * quand on appuie sur Entrée. */
const StepNumberInput = ({
	inputRef,
	className,
	value,
	editing,
	onChange,
	onCommit,
}: StepNumberInputProps) => (
	<input
		ref={inputRef}
		className={`node__input ${className} nodrag`}
		type="text"
		value={value}
		onChange={(e) => onChange(e.target.value)}
		onKeyDown={(e) => {
			if (e.key === "Enter" || e.key === "Escape") {
				inputRef.current?.blur();
			} else if (e.key.length == 1 && !range(0, 10).includes(parseInt(e.key))) {
				e.preventDefault();
			}
		}}
		onBlur={onCommit}
		style={{
			width: "100%",
			textAlign: "center",
			border: "none",
			outline: "none",
			pointerEvents: !editing ? "none" : "all",
		}}
	/>
);

export default StepNumberInput;
