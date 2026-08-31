"use client";
import { Box } from "@mui/material";
import { useReactFlow } from "@xyflow/react";
import { useJunctionNodeContext } from "./context/JunctionNodeContext";
import useBarDrag from "./context/useBarDrag";

const JunctionNodeVerticalBar = ({
	color,
	left,
	pivot,
	branchId,
}: {
	color: string;
	left: number;
	pivot: boolean;
	branchId?: string;
}) => {
	const {
		nodeId,
		width,
		data,
		pivotSelected,
		selectedBranchId,
		selectBranch,
		selectPivot,
	} = useJunctionNodeContext();
	const selected =
		(pivot && pivotSelected) || (!pivot && selectedBranchId === branchId);

	const startDrag = useBarDrag(
		nodeId,
		data,
		pivot,
		branchId ?? null,
		left,
		width,
	);

	const { setNodes, setEdges } = useReactFlow();

	const grab = () => {
		if (pivot) selectPivot();
		else if (branchId) selectBranch(branchId);
		else return;
		// Sélectionner un pin vide toute la sélection du flow : un pin n'est jamais
		// sélectionné en même temps qu'un nœud ou une liaison.
		setNodes((nodes) =>
			nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
		);
		setEdges((edges) =>
			edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
		);
	};

	return (
		<Box
			component="div"
			className="junction-node__bar nodrag nopan"
			sx={{
				position: "absolute",
				width: selected ? "4px" : "1px",
				background: selected ? "red" : color,
				height: "100%",
				left: (selected ? left - 2 : left - 0.5) + "px",
				cursor: "ew-resize",
				// Élargit la zone de saisie : la barre visible ne fait que 1 à 4px.
				"&::before": {
					content: '""',
					position: "absolute",
					top: "-6px",
					bottom: "-6px",
					left: "-8px",
					right: "-8px",
				},
			}}
			onPointerDown={(e) => {
				grab();
				startDrag(e);
			}}
			// Empêche React Flow de sélectionner la jonction quand on vise un pin :
			// jonction et pin ne sont jamais sélectionnés ensemble.
			onMouseDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
		/>
	);
};

export default JunctionNodeVerticalBar;
