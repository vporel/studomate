type ContextMenuItemBaseType = {
	label: string;
	shortcut?: string;
	checked?: boolean;
	onClick?: () => void;
	disabled?: boolean;
};

export type ContextMenuItemType = ContextMenuItemBaseType & {
	subItems?: ContextMenuItemBaseType[];
};
