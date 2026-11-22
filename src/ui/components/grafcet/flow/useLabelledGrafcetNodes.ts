"use client";

import type { ElementType } from "@/schemas/grafcet/element.schema";
import { useT } from "@/ui/i18n/useT";
import { useMemo } from "react";
import describeGrafcetElement, {
	type GrafcetElementsTranslator,
} from "./describe-grafcet-element";
import type { GrafcetNodeType } from "./grafcet-nodes-definitions";

const LABELLED_BY_TRANSLATOR = new WeakMap<
	GrafcetElementsTranslator,
	WeakMap<GrafcetNodeType, GrafcetNodeType>
>();

/**
 * The store's nodes with an `ariaLabel` in the interface language. A node object the store did
 * not replace keeps the same labelled object, so React Flow does not re-render untouched nodes
 * while another one is dragged; a language change relabels every node.
 */
export default function useLabelledGrafcetNodes(
	nodes: GrafcetNodeType[],
): GrafcetNodeType[] {
	const t = useT(
		"grafcetEditor.elements",
	) as unknown as GrafcetElementsTranslator;
	return useMemo(() => {
		let labelled = LABELLED_BY_TRANSLATOR.get(t);
		if (!labelled) {
			labelled = new WeakMap();
			LABELLED_BY_TRANSLATOR.set(t, labelled);
		}
		return nodes.map((node) => {
			let result = labelled.get(node);
			if (!result) {
				result = {
					...node,
					ariaLabel: describeGrafcetElement(
						node.type as ElementType,
						node.data,
						t,
					),
				} as GrafcetNodeType;
				labelled.set(node, result);
			}
			return result;
		});
	}, [nodes, t]);
}
