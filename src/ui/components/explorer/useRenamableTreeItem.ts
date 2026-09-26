import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";

type UseRenamableTreeItemOptions = {
	name: string;
	designing: boolean;
	/** Called with the trimmed input, or the current name when the input is blank. */
	onRename: (name: string) => void;
};

export function useRenamableTreeItem({
	name,
	designing,
	onRename,
}: UseRenamableTreeItemOptions) {
	const [labelMode, setLabelMode] = useState<"normal" | "edit">("normal");
	const [editingName, setEditingName] = useState(name);

	const commit = useCallback(() => {
		setLabelMode("normal");
		const trimmed = editingName.trim();
		onRename(trimmed !== "" ? trimmed : name);
	}, [editingName, name, onRename]);

	const startEditing = useCallback(() => setLabelMode("edit"), []);

	const onDoubleClick = useCallback(() => {
		if (designing) setLabelMode("edit");
	}, [designing]);

	const inputProps = {
		value: editingName,
		onChange: (e: ChangeEvent<HTMLInputElement>) =>
			setEditingName(e.target.value),
		onBlur: commit,
		onKeyDown: (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === "Escape") commit();
		},
	};

	return { labelMode, startEditing, onDoubleClick, inputProps };
}
