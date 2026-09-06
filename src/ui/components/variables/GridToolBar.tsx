import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, IconButton } from "@mui/material";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled } from "@mui/material/styles";
import { useT } from "@/ui/i18n/useT";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { toast } from "react-toastify";
import Variable from "@/schemas/variable/variable.schema";
import { exportVariablesTablePdf } from "@/ui/lib/pdf/variables-table-pdf";
import trackEvent from "@/ui/lib/analytics";
import {
	ExportCsv,
	FilterPanelTrigger,
	GridRowSelectionModel,
	QuickFilter,
	QuickFilterClear,
	QuickFilterControl,
	QuickFilterTrigger,
	Toolbar,
	ToolbarButton,
	useGridApiContext,
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

const StyledToolbarButton = styled(ToolbarButton)<{ ownerState: OwnerState }>(
	({ theme, ownerState }) => ({
		gridArea: "1 / 1",
		width: "min-content",
		height: "min-content",
		zIndex: 1,
		opacity: ownerState.expanded ? 0 : 1,
		pointerEvents: ownerState.expanded ? "none" : "auto",
		transition: theme.transitions.create(["opacity"]),
	}),
);

const StyledTextField = styled(TextField)<{
	ownerState: OwnerState;
}>(({ theme, ownerState }) => ({
	gridArea: "1 / 1",
	overflowX: "clip",
	width: ownerState.expanded ? 260 : "var(--trigger-width)",
	opacity: ownerState.expanded ? 1 : 0,
	transition: theme.transitions.create(["width", "opacity"]),
}));

export default function GridToolBar({
	rowSelectionModel,
	zoneVariables,
	pageTitle,
}: {
	rowSelectionModel: GridRowSelectionModel;
	zoneVariables: Variable[];
	pageTitle: string;
}) {
	const t = useT("pages.variablesGrid.toolbar");
	const tColumns = useT("pages.variablesGrid.columns");
	const tExport = useT("projects.export");
	const projectName = useProjectStore((state) => state.project?.name ?? "");
	const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
	const exportMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
	const variablesManager = useProjectStore((state) => state.variablesManager);
	const apiRef = useGridApiContext();

	const exportPdf = () => {
		setExportMenuOpen(false);
		const date = new Date().toLocaleDateString();
		void exportVariablesTablePdf({
			filename: `${projectName} - ${pageTitle}`,
			title: tExport("variablesPdfHeading", {
				page: pageTitle,
				project: projectName,
				date,
			}),
			variables: zoneVariables,
			labels: {
				mnemonic: tColumns("mnemonic"),
				type: tColumns("type"),
				address: tColumns("address"),
				comment: tColumns("comment"),
			},
		})
			.then(() =>
				trackEvent("pdf-exported", { programs: 0, withVariablesTable: true }),
			)
			.catch(() => toast.error(t("exportPdfError")));
	};

	// Fait défiler jusqu'à la ligne d'ajout vide en bas de table et la passe en édition.
	const goToNewVariableRow = () => {
		const id = "new-variable";
		apiRef.current.scrollToIndexes({
			rowIndex: apiRef.current.getRowsCount() - 1,
		});
		requestAnimationFrame(() => {
			apiRef.current.getRowElement(id)?.scrollIntoView?.({ block: "center" });
			try {
				apiRef.current.startRowEditMode({ id, fieldToFocus: "mnemonic" });
			} catch {
				// la ligne n'est pas encore rendue ; le défilement l'aura mise en vue
			}
		});
	};

	return (
		<Toolbar>
			<Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
				<Tooltip title={t("delete")}>
					<span>
						<IconButton
							disabled={rowSelectionModel.ids.size === 0}
							onClick={() =>
								variablesManager.removeVariables(
									Array.from(rowSelectionModel.ids).map((id) => id.toString()),
								)
							}
							aria-label={t("deleteSelectedAria")}
						>
							<DeleteIcon />
						</IconButton>
					</span>
				</Tooltip>
				<Button
					size="small"
					startIcon={<AddIcon />}
					onClick={goToNewVariableRow}
				>
					{t("newVariable")}
				</Button>
			</Box>
			<Tooltip title={t("filters")}>
				<FilterPanelTrigger
					render={(props, state) => (
						<ToolbarButton {...props} color="default">
							<Badge
								badgeContent={state.filterCount}
								color="primary"
								variant="dot"
							>
								<FilterListIcon fontSize="small" />
							</Badge>
						</ToolbarButton>
					)}
				/>
			</Tooltip>

			<Divider
				orientation="vertical"
				variant="middle"
				flexItem
				sx={{ mx: 0.5 }}
			/>

			<Tooltip title={t("export")}>
				<ToolbarButton
					ref={exportMenuTriggerRef}
					id="export-menu-trigger"
					aria-controls="export-menu"
					aria-haspopup="true"
					aria-label={t("export")}
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
				<MenuItem onClick={exportPdf}>{t("exportPdf")}</MenuItem>
				<ExportCsv
					render={<MenuItem />}
					onClick={() => setExportMenuOpen(false)}
				>
					{t("exportCsv")}
				</ExportCsv>
			</Menu>

			<StyledQuickFilter>
				<QuickFilterTrigger
					render={(triggerProps, state) => (
						<Tooltip title={t("search")} enterDelay={0}>
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
							aria-label={t("search")}
							placeholder={t("searchPlaceholder")}
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
												aria-label={t("clearSearch")}
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
