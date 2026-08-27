import { alpha, SxProps, Theme } from "@mui/material";

/**
 * Halo clignotant partagé par tous les nœuds du ladder (contact, bobine, bloc) pour matérialiser
 * `highlightedNodesIds` (voir `LadderViewManager.temporarilyHighlightNodesAndEdges`) — un `::before`
 * plutôt qu'une bordure directe pour ne pas décaler la mise en page du nœud pendant l'animation.
 */
export function getHighlightOverlaySx(
	highlighted: boolean | undefined,
	th: Theme,
): SxProps {
	if (!highlighted) return {};
	return {
		"&::before": {
			content: '""',
			position: "absolute",
			top: "12px",
			left: "0",
			right: "0",
			bottom: "12px",
			border: "4px solid",
			borderColor: th.palette.primary.main,
			borderRadius: "4px",
			animation: "ladder-node-blink 1s infinite linear",
		},
		"@keyframes ladder-node-blink": {
			"0%": { borderColor: th.palette.primary.main },
			"50%": { borderColor: alpha(th.palette.primary.main, 0.25) },
			"100%": { borderColor: th.palette.primary.main },
		},
	};
}
