import HmiPage from "@/schemas/hmi/hmi-page.schema";
import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
} from "@/schemas/hmi/hmi-widget.schema";
import { RawReference, ReferenceAccess } from "./cross-reference.types";

/**
 * Références portées par un widget HMI :
 * - sa variable liée (`data.variable`) — lecture (afficheur, voyant, jauge) ou écriture (bouton,
 *   interrupteur, saisie) selon `HMI_WIDGET_DEFINITIONS[type].variableBinding.writes` ;
 * - les variables de ses animations (position `x`/`y`, style) — lecture.
 * Les formes pures (rectangle, texte…) n'ont pas de liaison.
 */
function widgetReferences(widget: HmiWidget, page: HmiPage): RawReference[] {
	const refs: RawReference[] = [];
	const base = {
		programId: page.id,
		programType: "hmi" as const,
		locationId: widget.id,
		locationParams: { widgetName: widget.name, widgetType: widget.type },
	};

	const binding = HMI_WIDGET_DEFINITIONS[widget.type].variableBinding;
	if (binding && "variable" in widget.data && widget.data.variable) {
		refs.push({
			...base,
			variableName: widget.data.variable,
			access: (binding.writes ? "write" : "read") as ReferenceAccess,
			locationKind: "hmi-widget-binding",
		});
	}

	const animations =
		"animations" in widget.data ? widget.data.animations : undefined;
	const animationVariables = [
		animations?.position?.xVariable,
		animations?.position?.yVariable,
		animations?.style?.variable,
	];
	for (const variableName of animationVariables) {
		if (!variableName) continue;
		refs.push({
			...base,
			variableName,
			access: "read",
			locationKind: "hmi-widget-animation",
		});
	}

	return refs;
}

/** Toutes les références portées par les widgets d'une page HMI. Ne lève jamais. */
export default function collectHmiReferences(page: HmiPage): RawReference[] {
	return Object.values(page.widgets).flatMap((widget) =>
		widgetReferences(widget, page),
	);
}
