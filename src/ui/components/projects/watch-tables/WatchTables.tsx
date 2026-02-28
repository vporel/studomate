"use client";

import ResizableFixedBox from "@/ui/lib/mui/ResizableFixedBox";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { useProjectStore } from "../ProjectContext";
import TabContent from "./TabContent";

function Header({ onClose }: { onClose: () => void }) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
			<Typography variant="h6">{"Tables de visualisation"}</Typography>
			<IconButton onClick={onClose} size="small" aria-label="close-analysis-errors">
				<CloseIcon />
			</IconButton>
		</Box>
	);
}

export default function WatchTables() {
	const mode = useProjectStore((s) => s.mode);
	const watchTablesVisible = useProjectStore((s) => s.watchTablesVisible);
	const setWatchTablesVisible = useProjectStore((s) => s.setWatchTablesVisible);
	const [tab, setTab] = useState(0);

	const onClose = () => {
		setWatchTablesVisible(false);
	};

	if (!watchTablesVisible || mode !== ProjectMode.SIMULATION) return null;

	return (
		<ResizableFixedBox
			position="bottom"
			initialSize={300}
			offset={30}
			contentContainerProps={{
				sx: {
					px: 2,
					py: 1,
				},
			}}
		>
			<Header onClose={onClose} />
			<Divider sx={{ my: 1 }} />
			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ height: 30, minHeight: 0 }}>
				<Tab label="Entrées" sx={{ minHeight: 0, pt: 0.3 }} />
				<Tab label="Sorties" sx={{ minHeight: 0, pt: 0.3 }} />
				<Tab label="Mémoires" sx={{ minHeight: 0, pt: 0.3 }} />
			</Tabs>

			<Box sx={{ p: 2 }}>
				{tab === 0 && <TabContent variableDirection="IN" />}
				{tab === 1 && <TabContent variableDirection="OUT" />}
				{tab === 2 && <TabContent variableDirection="INOUT" />}
			</Box>
		</ResizableFixedBox>
	);
}
