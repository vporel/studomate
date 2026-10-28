"use client";

import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import CustomModal from "@/ui/components/mui/CustomModal";
import { useT } from "@/ui/i18n/useT";
import { Box } from "@mui/material";
import HmiWidgetEventsPanel from "./HmiWidgetEventsPanel";

/** Pane flottant affichant la liste des événements du widget sélectionné, ouvert depuis
 * `HmiWidgetPropertiesPanel` (visibilité portée par le store). */
const HmiWidgetEventsPane = ({
	widget,
	readOnly = false,
}: {
	widget: HmiWidget;
	readOnly?: boolean;
}) => {
	const t = useT("hmiEditor.panel");
	const visible = useHmiStore((s) => s.eventsPaneVisible);
	const close = useHmiStore((s) => s.closeEventsPane);

	return (
		<CustomModal
			open={visible}
			compact
			flexColumn
			title={t("eventsHeading", { name: widget.name })}
			onClose={close}
			width="min(90vw, 560px)"
			sx={{ maxHeight: "min(80vh, 520px)" }}
		>
			<Box sx={{ overflow: "auto" }}>
				<Box inert={readOnly}>
					<HmiWidgetEventsPanel widget={widget} />
				</Box>
			</Box>
		</CustomModal>
	);
};

export default HmiWidgetEventsPane;
