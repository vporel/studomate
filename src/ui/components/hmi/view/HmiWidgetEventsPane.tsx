"use client";

import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Modal, Paper, Tooltip, Typography } from "@mui/material";
import HmiWidgetEventsPanel from "./HmiWidgetEventsPanel";
import { useT } from "@/ui/i18n/useT";

/** Pane flottant affichant les événements du widget sélectionné — même principe que
 * `HmiWidgetAnimationsPane` (ouvert depuis `HmiWidgetPropertiesPanel`, visibilité portée par le
 * store). Pas d'onglets ici : un seul contenu, la liste des événements du widget. */
const HmiWidgetEventsPane = ({ widget }: { widget: HmiWidget }) => {
	const t = useT("hmiEditor.panel");
	const visible = useHmiStore((s) => s.eventsPaneVisible);
	const close = useHmiStore((s) => s.closeEventsPane);

	if (!visible) return null;

	return (
		<Modal open onClose={close}>
			<Paper
				sx={{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "min(90vw, 560px)",
					maxHeight: "min(80vh, 520px)",
					display: "flex",
					flexDirection: "column",
					outline: "none",
				}}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						px: 2,
						py: 1,
						borderBottom: "1px solid #e0e0e0",
					}}
				>
					<Typography variant="h6">{t("eventsHeading", { name: widget.name })}</Typography>
					<Tooltip title={t("close")}>
						<IconButton size="small" onClick={close} aria-label={t("close")}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
				<Box sx={{ overflow: "auto" }}>
					<HmiWidgetEventsPanel widget={widget} />
				</Box>
			</Paper>
		</Modal>
	);
};

export default HmiWidgetEventsPane;
