import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidgetKind,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { HmiWidgetTool } from "@/ui/components/hmi/view/constants";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";

/** Outils « un type = un outil » d'un groupe de palette, triés par `paletteOrder` — dérivés des
 * définitions : ajouter un widget simple ne demande aucune édition ici. */
function defaultTools(kind: HmiWidgetKind): HmiWidgetTool[] {
	return (Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[])
		.filter((type) => HMI_WIDGET_DEFINITIONS[type].kind === kind)
		.sort(
			(a, b) => HMI_WIDGET_UI[a].paletteOrder - HMI_WIDGET_UI[b].paletteOrder,
		)
		.map((type) => ({ type }));
}

/** Outils « widgets » (interactifs, liés à une variable). Séparé de `HMI_SHAPE_TOOLS` par un
 * séparateur dans la toolbar (voir `HmiPageContent`). */
export const HMI_WIDGET_TOOLS: HmiWidgetTool[] = defaultTools("interactive");

/** Outils « formes » (purement visuelles) — outils dérivés plus la variante manuelle « Cercle »
 * (même type `ellipse`, forme initiale carrée et ratio verrouillé). */
export const HMI_SHAPE_TOOLS: HmiWidgetTool[] = [
	...defaultTools("shape").flatMap((tool) =>
		tool.type === "ellipse"
			? [
					{
						type: "ellipse" as const,
						label: "circle",
						sizeOverride: { width: 40, height: 40 },
						dataOverride: { lockAspectRatio: true },
						previewWidth: 24,
					},
					{ type: "ellipse" as const, label: "ellipse" },
				]
			: [tool],
	),
];
