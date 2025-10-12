type ContextMenuItemBaseType = {
	label: string;
	shortcut?: string;
	onClick?: () => void;
	disabled?: boolean;
};

export type ContextMenuItemType = ContextMenuItemBaseType & {
	subItems?: ContextMenuItemBaseType[];
};
