"use client";
import { SxProps } from "@mui/material";
import Box from "@mui/material/Box";
import {
	TreeItemCheckbox,
	TreeItemContent,
	TreeItemGroupTransition,
	TreeItemIconContainer,
	TreeItemLabel,
	TreeItemRoot,
} from "@mui/x-tree-view/TreeItem";
import { TreeItemIcon } from "@mui/x-tree-view/TreeItemIcon";
import { TreeItemProvider } from "@mui/x-tree-view/TreeItemProvider";
import { useTreeItem, UseTreeItemParameters } from "@mui/x-tree-view/useTreeItem";
import * as React from "react";

export type CustomTreeItemStyles = {
	root?: SxProps;
	label?: SxProps;
	icon?: SxProps;
};

interface CustomTreeItemProps
	extends Omit<UseTreeItemParameters, "rootRef">,
		Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
	IconComponent?: React.ElementType;
	styles?: CustomTreeItemStyles;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
	props: CustomTreeItemProps,
	ref: React.Ref<HTMLLIElement>
) {
	const { id, itemId, label, disabled, children, IconComponent, styles, ...other } = props;

	const {
		getContextProviderProps,
		getRootProps,
		getContentProps,
		getIconContainerProps,
		getCheckboxProps,
		getLabelProps,
		getGroupTransitionProps,
		status,
	} = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

	return (
		<TreeItemProvider {...getContextProviderProps()}>
			<TreeItemRoot {...getRootProps(other)} sx={styles?.root}>
				<TreeItemContent {...getContentProps()}>
					<TreeItemIconContainer {...getIconContainerProps()}>
						<TreeItemIcon status={status} />
					</TreeItemIconContainer>
					<TreeItemCheckbox {...getCheckboxProps()} />
					<Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}>
						{IconComponent && <IconComponent sx={styles?.icon} />}
						<TreeItemLabel {...getLabelProps()} sx={styles?.label} />
					</Box>
				</TreeItemContent>
				{children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
			</TreeItemRoot>
		</TreeItemProvider>
	);
});

export default CustomTreeItem;
