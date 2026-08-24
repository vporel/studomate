"use client";

import { BLOCK_PORT_LABELS, BlockData } from "@/schemas/ladder/block.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { GRID_CELL_HEIGHT, GRID_CELL_WIDTH } from "@/ui/utils/ladder/ladder-flow-builder";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export type BlockNodeData = BlockData;
export type BlockNodeType = Node<BlockNodeData> & { type: "block" };

/** Un bloc occupe 2 cellules de grille horizontalement (contre 1 pour un contact/une bobine) —
 * voir `getElementWidth`. */
export const BLOCK_NODE_DIMENSIONS = { width: GRID_CELL_WIDTH * 2, height: GRID_CELL_HEIGHT };

const BlockNode = ({ id, data, selected }: NodeProps<BlockNodeType>) => {
	const th = useTheme();
	const programName = useProjectStore((state) => state.project?.ladders[data.params.programId]?.name) ?? "";
	const highlighted = useLadderStore((state) => state.highlightedNodesIds?.includes(id));

	const ports = BLOCK_PORT_LABELS[data.blockType];

	return (
		<Box
			sx={{
				width: BLOCK_NODE_DIMENSIONS.width,
				height: GRID_CELL_HEIGHT,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				...(highlighted
					? {
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
						}
					: {}),
			}}
		>
			<Handle id="target" type="target" position={Position.Left} />
			<Box
				sx={{
					width: "100%",
					height: 32,
					boxSizing: "border-box",
					border: "1.5px solid",
					borderColor: selected ? th.palette.primary.main : "black",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
				}}
			>
				<Typography
					noWrap
					sx={{
						position: "absolute",
						top: "3px",
						left: "10%",
						width: "80%",
						fontSize: 9,
						textAlign: "center",
						lineHeight: 1.2,
						mx: "auto",
						background: "white",
						px: "2px",
					}}
				>
					{programName}
				</Typography>
				<Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 8, px: "2px" }}>
					<span>{ports.input}</span>
					<span>{ports.output}</span>
				</Box>
			</Box>
			<Handle id="source" type="source" position={Position.Right} />
		</Box>
	);
};

export default BlockNode;
