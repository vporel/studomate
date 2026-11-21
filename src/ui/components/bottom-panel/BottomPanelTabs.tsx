"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Tooltip } from "@mui/material";
import { ReactNode } from "react";

export type BottomPanelTabItem<Id extends string = string> = {
	id: Id;
	label: string;
	/** Colour of the label, whether the tab is selected or not. */
	color?: string;
	dataTour?: string;
	content: ReactNode;
};

type BottomPanelTabsProps<Id extends string> = {
	tabs: BottomPanelTabItem<Id>[];
	activeId: Id | null;
	onSelect: (id: Id) => void;
	onClose: () => void;
	closeLabel: string;
	closeAriaLabel: string;
};

/** Tabs above the content of the active one, with a single close button for the whole panel. */
export default function BottomPanelTabs<Id extends string>({
	tabs,
	activeId,
	onSelect,
	onClose,
	closeLabel,
	closeAriaLabel,
}: BottomPanelTabsProps<Id>) {
	const active = tabs.find((tab) => tab.id === activeId);
	if (!active) return null;

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				backgroundColor: "white",
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					flexShrink: 0,
					borderBottom: "1px solid lightgray",
				}}
			>
				<Box
					role="tablist"
					sx={{
						display: "flex",
						gap: 0.5,
						flex: 1,
						minWidth: 0,
						overflowX: "auto",
						px: 1,
						py: 0.5,
					}}
				>
					{tabs.map((tab) => {
						const selected = tab.id === active.id;
						return (
							<Box
								key={tab.id}
								component="button"
								type="button"
								role="tab"
								id={`bottom-panel-tab-${tab.id}`}
								aria-selected={selected}
								aria-controls={`bottom-panel-content-${tab.id}`}
								data-tour={tab.dataTour}
								onClick={() => onSelect(tab.id)}
								sx={{
									px: 1.5,
									py: 0.25,
									border: "none",
									borderRadius: "3px",
									backgroundColor: selected
										? "rgb(235, 235, 235)"
										: "transparent",
									color: tab.color ?? "text.primary",
									cursor: "pointer",
									font: "inherit",
									fontSize: "0.875rem",
									fontWeight: selected ? 500 : "normal",
									whiteSpace: "nowrap",
									"&:hover": {
										backgroundColor: selected
											? "rgb(235, 235, 235)"
											: "rgb(245, 245, 245)",
									},
								}}
							>
								{tab.label}
							</Box>
						);
					})}
				</Box>
				<Tooltip title={closeLabel}>
					<IconButton
						size="small"
						aria-label={closeAriaLabel}
						onClick={onClose}
						sx={{ mx: 0.5 }}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			</Box>
			<Box
				role="tabpanel"
				id={`bottom-panel-content-${active.id}`}
				aria-labelledby={`bottom-panel-tab-${active.id}`}
				sx={{
					flex: 1,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					px: 2,
					py: 1,
				}}
			>
				{active.content}
			</Box>
		</Box>
	);
}
