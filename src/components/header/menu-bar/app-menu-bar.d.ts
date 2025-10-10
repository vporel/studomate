type AppMenuItemBaseType = {
	label: string;
	shortcut?: string;
	onClick?: () => void;
	disabled?: boolean;
};

export type AppMenuType = {
	id: string;
	label: string;
	items: (AppMenuItemBaseType & {
		subItems?: AppMenuItemBaseType[];
	})[][]; // array of groups of items
};
