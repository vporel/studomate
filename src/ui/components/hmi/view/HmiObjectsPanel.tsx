"use client";

import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { Box, Typography } from "@mui/material";

/** Liste des widgets de la page, triés du plus haut au plus bas dans la pile (voir
 * `HmiWidgetBase.stackOrder`) — un clic sélectionne le widget correspondant sur le canvas. */
const HmiObjectsPanel = () => {
	const widgets = useHmiStore((s) => s.hmiPage.widgets);
	const selectedWidgetIds = useHmiStore((s) => s.selectedWidgetIds);
	const selectWidget = useHmiStore((s) => s.selectWidget);

	const sortedWidgets = Object.values(widgets).sort(
		(a, b) => b.stackOrder - a.stackOrder,
	);

	if (sortedWidgets.length === 0) {
		return (
			<Typography sx={{ px: 1.5, pb: 1.5, fontSize: "0.8rem", color: "#888" }}>
				Aucun objet.
			</Typography>
		);
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", pb: 0.5 }}>
			{sortedWidgets.map((widget) => {
				const selected = selectedWidgetIds.includes(widget.id);
				return (
					<Box
						key={widget.id}
						onClick={() => selectWidget(widget.id)}
						sx={{
							px: 1.5,
							py: 0.75,
							fontSize: "0.85rem",
							cursor: "pointer",
							userSelect: "none",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							backgroundColor: selected
								? "rgba(25, 118, 210, 0.12)"
								: "transparent",
							"&:hover": {
								backgroundColor: selected
									? "rgba(25, 118, 210, 0.18)"
									: "rgba(0, 0, 0, 0.04)",
							},
						}}
					>
						{widget.name}
					</Box>
				);
			})}
		</Box>
	);
};

export default HmiObjectsPanel;
