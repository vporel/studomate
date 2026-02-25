import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import { Box, IconButton } from "@mui/material";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import {
	ExportCsv,
	ExportPrint,
	FilterPanelTrigger,
	GridRowSelectionModel,
	QuickFilter,
	QuickFilterClear,
	QuickFilterControl,
	QuickFilterTrigger,
	Toolbar,
	ToolbarButton,
} from "@mui/x-data-grid";
import * as React from "react";
import { useProjectStore } from "../projects/ProjectContext";

type OwnerState = {
	expanded: boolean;
};

const StyledQuickFilter = styled(QuickFilter)({
	display: "grid",
	alignItems: "center",
});

const StyledToolbarButton = styled(ToolbarButton)<{ ownerState: OwnerState }>(({ theme, ownerState }) => ({
	gridArea: "1 / 1",
	width: "min-content",
	height: "min-content",
	zIndex: 1,
	opacity: ownerState.expanded ? 0 : 1,
	pointerEvents: ownerState.expanded ? "none" : "auto",
	transition: theme.transitions.create(["opacity"]),
}));

const StyledTextField = styled(TextField)<{
	ownerState: OwnerState;
}>(({ theme, ownerState }) => ({
	gridArea: "1 / 1",
	overflowX: "clip",
	width: ownerState.expanded ? 260 : "var(--trigger-width)",
	opacity: ownerState.expanded ? 1 : 0,
	transition: theme.transitions.create(["width", "opacity"]),
}));

export default function GridToolBar({ rowSelectionModel }: { rowSelectionModel: GridRowSelectionModel }) {
	const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
	const exportMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
	const variablesManager = useProjectStore((state) => state.variablesManager);

	return (
		<Toolbar>
			<Box sx={{ flex: 1 }}>
				<IconButton
					disabled={rowSelectionModel.ids.size === 0}
					onClick={() =>
						variablesManager.removeVariables(
							Array.from(rowSelectionModel.ids).map((id) => id.toString()),
						)
					}
				>
					<DeleteIcon />
				</IconButton>
			</Box>
			<Tooltip title="Filtres">
				<FilterPanelTrigger
					render={(props, state) => (
						<ToolbarButton {...props} color="default">
							<Badge badgeContent={state.filterCount} color="primary" variant="dot">
								<FilterListIcon fontSize="small" />
							</Badge>
						</ToolbarButton>
					)}
				/>
			</Tooltip>

			<Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 0.5 }} />

			<Tooltip title="Exporter">
				<ToolbarButton
					ref={exportMenuTriggerRef}
					id="export-menu-trigger"
					aria-controls="export-menu"
					aria-haspopup="true"
					aria-expanded={exportMenuOpen ? "true" : undefined}
					onClick={() => setExportMenuOpen(true)}
				>
					<FileDownloadIcon fontSize="small" />
				</ToolbarButton>
			</Tooltip>

			<Menu
				id="export-menu"
				anchorEl={exportMenuTriggerRef.current}
				open={exportMenuOpen}
				onClose={() => setExportMenuOpen(false)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				slotProps={{
					list: {
						"aria-labelledby": "export-menu-trigger",
					},
				}}
			>
				<ExportPrint render={<MenuItem />} onClick={() => setExportMenuOpen(false)}>
					Imprimer
				</ExportPrint>
				<ExportCsv render={<MenuItem />} onClick={() => setExportMenuOpen(false)}>
					Exporter en CSV
				</ExportCsv>
			</Menu>

			<StyledQuickFilter>
				<QuickFilterTrigger
					render={(triggerProps, state) => (
						<Tooltip title="Rechercher" enterDelay={0}>
							<StyledToolbarButton
								{...triggerProps}
								ownerState={{ expanded: state.expanded }}
								color="default"
								aria-disabled={state.expanded}
							>
								<SearchIcon fontSize="small" />
							</StyledToolbarButton>
						</Tooltip>
					)}
				/>
				<QuickFilterControl
					render={({ ref, ...controlProps }, state) => (
						<StyledTextField
							{...controlProps}
							ownerState={{ expanded: state.expanded }}
							inputRef={ref}
							aria-label="Rechercher"
							placeholder="Rechercher..."
							size="small"
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon fontSize="small" />
										</InputAdornment>
									),
									endAdornment: state.value ? (
										<InputAdornment position="end">
											<QuickFilterClear
												edge="end"
												size="small"
												aria-label="Effacer la recherche"
												material={{ sx: { marginRight: -0.75 } }}
											>
												<CancelIcon fontSize="small" />
											</QuickFilterClear>
										</InputAdornment>
									) : null,
									...controlProps.slotProps?.input,
								},
								...controlProps.slotProps,
							}}
						/>
					)}
				/>
			</StyledQuickFilter>
		</Toolbar>
	);
}
