import {
	ChangeEvent,
	KeyboardEvent,
	useCallback,
	useEffect,
	useState,
} from "react";

type UseRenamableTreeItemOptions = {
	name: string;
	designing: boolean;
	/** Called with the trimmed input, or the current name when the input is blank. */
	onRename: (name: string) => void;
	/** Called on Delete (not Backspace) while the item itself has focus in design mode. */
	onDelete?: () => void;
};

export function useRenamableTreeItem({
	name,
	designing,
	onRename,
	onDelete,
}: UseRenamableTreeItemOptions) {
	const [labelMode, setLabelMode] = useState<"normal" | "edit">("normal");
	const [editingName, setEditingName] = useState(name);

	useEffect(() => {
		if (labelMode === "normal") setEditingName(name);
	}, [name, labelMode]);

	const commit = useCallback(() => {
		setLabelMode("normal");
		const trimmed = editingName.trim();
		onRename(trimmed !== "" ? trimmed : name);
	}, [editingName, name, onRename]);

	const startEditing = useCallback(() => setLabelMode("edit"), []);

	const onDoubleClick = useCallback(() => {
		if (designing) setLabelMode("edit");
	}, [designing]);

	const onKeyDown = useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			if (!designing || e.target !== e.currentTarget) return;
			if (e.key === "F2") {
				e.preventDefault();
				e.stopPropagation();
				setLabelMode("edit");
			} else if (e.key === "Delete" && onDelete) {
				e.preventDefault();
				e.stopPropagation();
				onDelete();
			}
		},
		[designing, onDelete],
	);

	const inputProps = {
		value: editingName,
		onChange: (e: ChangeEvent<HTMLInputElement>) =>
			setEditingName(e.target.value),
		onBlur: commit,
		onKeyDown: (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === "Escape") commit();
		},
	};

	return { labelMode, startEditing, onDoubleClick, onKeyDown, inputProps };
}
