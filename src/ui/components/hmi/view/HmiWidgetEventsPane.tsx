"use client";

import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useT } from "@/ui/i18n/useT";
import { Box } from "@mui/material";
import HmiFloatingPane from "./HmiFloatingPane";
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

	if (!visible) return null;

	return (
		<HmiFloatingPane
			title={t("eventsHeading", { name: widget.name })}
			onClose={close}
			width="min(90vw, 560px)"
			maxHeight="min(80vh, 520px)"
		>
			<Box sx={{ overflow: "auto" }}>
				<Box inert={readOnly}>
					<HmiWidgetEventsPanel widget={widget} />
				</Box>
			</Box>
		</HmiFloatingPane>
	);
};

export default HmiWidgetEventsPane;
