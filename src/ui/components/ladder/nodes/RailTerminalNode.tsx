"use client";

import {
	GRID_CELL_HEIGHT,
	RAIL_LANE_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import useLadderRailEnergized from "@/ui/components/ladder/useLadderRailEnergized";
import { Box, useTheme } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export type RailTerminalNodeData = { virtual: boolean };
export type RailTerminalNodeType = Node<RailTerminalNodeData> & {
	type: "railTerminal";
};

/** Un simple stub visuel, pas une colonne d'éléments — voir `RAIL_LANE_WIDTH`. */
export const RAIL_TERMINAL_NODE_DIMENSIONS = {
	width: RAIL_LANE_WIDTH,
	height: GRID_CELL_HEIGHT,
};

/**
 * Stub horizontal reliant la barre d'alimentation (bordure gauche du flow) au premier élément
 * d'une ligne. `virtual` (non persisté dans le schéma) est estompé, mais reste une source de
 * connexion valide : tracer manuellement depuis son handle matérialise la borne réelle (voir
 * `useLadderConnectHandler`).
 */
const RailTerminalNode = ({ data }: NodeProps<RailTerminalNodeType>) => {
	const { virtual } = data;
	const th = useTheme();
	const energized = useLadderRailEnergized();

	return (
		<Box
			sx={{
				width: RAIL_LANE_WIDTH,
				height: GRID_CELL_HEIGHT,
				display: "flex",
				alignItems: "center",
			}}
		>
			<Box
				sx={{
					width: "100%",
					height: "2px",
					background: energized
						? th.palette.energized.main
						: virtual
							? "rgba(0,0,0,0.25)"
							: "black",
				}}
			/>
			<Handle id="source" type="source" position={Position.Right} />
		</Box>
	);
};

export default RailTerminalNode;
