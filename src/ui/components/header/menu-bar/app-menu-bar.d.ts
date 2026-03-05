type AppMenuItemBaseType = {
	label: string;
	shortcut?: string;
	onClick?: () => void;
	disabled?: boolean;
	checked?: boolean;
};

export type AppMenuType = {
	id: string;
	label: string;
	items: (AppMenuItemBaseType & {
		subItems?: AppMenuItemBaseType[];
	})[][]; // array of groups of items
};
