export type ContextMenuItemBaseType = {
	label: string;
	shortcut?: string;
	checked?: boolean;
	onClick?: () => void;
	disabled?: boolean;
};

/** Séparateur entre deux groupes d'un sous-menu (voir `ContextMenuSubItems`) — équivalent, à
 * l'intérieur d'un sous-menu, du découpage en tableaux imbriqués de `ContextMenuItemType[][]`
 * pour les groupes de premier niveau. */
export type ContextMenuDividerType = { divider: true };

export type ContextMenuSubItemType =
	ContextMenuItemBaseType | ContextMenuDividerType;

export type ContextMenuItemType = ContextMenuItemBaseType & {
	subItems?: ContextMenuSubItemType[];
};
