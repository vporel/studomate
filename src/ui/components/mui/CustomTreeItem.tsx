"use client";
import { alpha, SxProps } from "@mui/material";
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
	input?: SxProps;
};

interface CustomTreeItemProps
	extends Omit<UseTreeItemParameters, "rootRef">,
		Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
	IconComponent?: React.ElementType;
	/** Contenu affiché à droite du libellé, poussé en bout de ligne (ex. un tag "Principale" —
	 * voir `ExplorerHmiItems`). */
	trailing?: React.ReactNode;
	labelMode?: "normal" | "edit";
	inputProps?: {
		value?: string;
		onChange?: React.ChangeEventHandler<HTMLInputElement>;
		onBlur?: React.FocusEventHandler<HTMLInputElement>;
		onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
	};
	styles?: CustomTreeItemStyles;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
	props: CustomTreeItemProps,
	ref: React.Ref<HTMLLIElement>
) {
	const {
		id,
		itemId,
		label,
		labelMode = "normal",
		disabled,
		children,
		IconComponent,
		trailing,
		inputProps,
		styles,
		...other
	} = props;

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

	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		if (labelMode === "edit" && inputRef.current) {
			inputRef.current.focus();
		}
	}, [labelMode]);

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
						{labelMode === "normal" ? (
							<TreeItemLabel {...getLabelProps()} sx={styles?.label} />
						) : (
							<Box
								component="input"
								ref={inputRef}
								sx={{
									outline: "none",
									border: "1px solid lightgray",
									backgroundColor: (th) => alpha(th.palette.primary.main, 0.05),
									color: (th) => th.palette.primary.main,
									width: "100%",
									height: "22px",
									...styles?.input,
								}}
								value={inputProps?.value}
								onChange={inputProps?.onChange}
								onClick={(e) => e.stopPropagation()}
								onBlur={(e) => inputProps?.onBlur?.(e)}
								onKeyDown={(e) => {
									e.stopPropagation();
									inputProps?.onKeyDown?.(e);
								}}
							/>
						)}
						{labelMode === "normal" && trailing}
					</Box>
				</TreeItemContent>
				{children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
			</TreeItemRoot>
		</TreeItemProvider>
	);
});

export default CustomTreeItem;
