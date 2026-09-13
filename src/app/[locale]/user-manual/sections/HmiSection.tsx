"use client";

import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidgetKind,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { useT } from "@/ui/i18n/useT";
import { Divider, Typography } from "@mui/material";
import { ManualList } from "./manual-ui";

const WIDGET_TYPES = Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[];

function widgetTypesByKind(kind: HmiWidgetKind): HmiWidgetType[] {
	return WIDGET_TYPES.filter(
		(type) => HMI_WIDGET_DEFINITIONS[type].kind === kind,
	).sort((a, b) => HMI_WIDGET_UI[a].paletteOrder - HMI_WIDGET_UI[b].paletteOrder);
}

export default function HmiSection({ selected }: { selected: string }) {
	const t = useT("manual.hmi");
	const tw = useT("hmiEditor");
	const isChild = selected.startsWith("hmi-");
	const show = (id: string) => !isChild || selected === id;

	const widgetList = (kind: HmiWidgetKind) =>
		widgetTypesByKind(kind).map((type) =>
			tw(HMI_WIDGET_UI[type].manualDescription as never),
		);

	return (
		<section id="hmi">
			<Typography variant="h2" mb={3}>
				{t("title")}
			</Typography>
			<Typography mb={2}>{t("p1")}</Typography>

			{show("hmi-pages") && (
				<article id="hmi-pages">
					<Typography variant="h3" mb={2}>
						{t("pagesTitle")}
					</Typography>
					<Typography mb={2}>{t("pagesIntro")}</Typography>
					<ManualList items={t.raw("pagesItems") as string[]} />
					<Typography mb={2}>{t("pagesMain")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("hmi-canvas") && (
				<article id="hmi-canvas">
					<Typography variant="h3" mb={2}>
						{t("canvasTitle")}
					</Typography>
					<Typography mb={2}>{t("canvasIntro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("canvasZoomTitle")}
					</Typography>
					<Typography mb={2}>{t("canvasZoomBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("canvasPlaceTitle")}
					</Typography>
					<Typography mb={2}>{t("canvasPlaceBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("canvasSelectTitle")}
					</Typography>
					<ManualList items={t.raw("canvasSelectItems") as string[]} />
					<Typography variant="h5" mb={1}>
						{t("canvasMoveTitle")}
					</Typography>
					<ManualList items={t.raw("canvasMoveItems") as string[]} />
					<Typography mb={2}>{t("canvasCopy")}</Typography>
					<Typography mb={2}>{t("canvasUndo")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("hmi-widgets") && (
				<article id="hmi-widgets">
					<Typography variant="h3" mb={2}>
						{t("widgetsTitle")}
					</Typography>
					<Typography mb={2}>
						{t("widgetsCount", { count: WIDGET_TYPES.length })}
					</Typography>
					<Typography variant="h5" mb={1}>
						{t("widgetsInteractiveTitle")}
					</Typography>
					<ManualList items={widgetList("interactive")} />
					<Typography variant="h5" mb={1}>
						{t("widgetsShapeTitle")}
					</Typography>
					<ManualList items={widgetList("shape")} />
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("hmi-properties") && (
				<article id="hmi-properties">
					<Typography variant="h3" mb={2}>
						{t("propertiesTitle")}
					</Typography>
					<Typography mb={2}>{t("propertiesIntro")}</Typography>
					<ManualList items={t.raw("propertiesItems") as string[]} />
					<Typography mb={2}>{t("propertiesObjects")}</Typography>
					<Typography mb={2}>{t("propertiesZOrder")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("hmi-animations") && (
				<article id="hmi-animations">
					<Typography variant="h3" mb={2}>
						{t("animationsTitle")}
					</Typography>
					<Typography mb={2}>{t("animationsIntro")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("animationsPositionTitle")}
					</Typography>
					<Typography mb={2}>{t("animationsPositionBody")}</Typography>
					<Typography variant="h5" mb={1}>
						{t("animationsStyleTitle")}
					</Typography>
					<Typography mb={2}>{t("animationsStyleBody")}</Typography>
					<ManualList items={t.raw("animationsStyleItems") as string[]} />
					<Typography mb={2}>{t("animationsStyleOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("hmi-events") && (
				<article id="hmi-events">
					<Typography variant="h3" mb={2}>
						{t("eventsTitle")}
					</Typography>
					<Typography mb={2}>{t("eventsIntro")}</Typography>
					<Typography mb={2}>{t("eventsBody1")}</Typography>
					<Typography mb={2}>{t("eventsBody2")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{show("hmi-simulation") && (
				<article id="hmi-simulation">
					<Typography variant="h3" mb={2}>
						{t("simulationTitle")}
					</Typography>
					<Typography mb={2}>{t("simulationBody1")}</Typography>
					<Typography mb={2}>{t("simulationBody2")}</Typography>
					<ManualList items={t.raw("simulationItems") as string[]} />
					<Typography mb={2}>{t("simulationOutro")}</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
