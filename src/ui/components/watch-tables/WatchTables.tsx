"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { useProjectStore } from "../projects/ProjectContext";
import TabContent from "./TabContent";

function Header({ onClose }: { onClose: () => void }) {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<Typography variant="h6">{"Tables de visualisation"}</Typography>
			<IconButton
				onClick={onClose}
				size="small"
				aria-label="close-watch-tables"
			>
				<CloseIcon />
			</IconButton>
		</Box>
	);
}

export default function WatchTables() {
	const setWatchTablesVisible = useProjectStore((s) => s.setWatchTablesVisible);
	const [tab, setTab] = useState(0);

	const onClose = () => {
		setWatchTablesVisible(false);
	};

	return (
		<Box p={1}>
			<Header onClose={onClose} />
			<Divider sx={{ mt: 0.5, mb: 1 }} />
			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				sx={{ height: 30, minHeight: 0 }}
			>
				<Tab label="Entrées" sx={{ minHeight: 0, pt: 0.3 }} />
				<Tab label="Sorties" sx={{ minHeight: 0, pt: 0.3 }} />
				<Tab label="Mémoires" sx={{ minHeight: 0, pt: 0.3 }} />
			</Tabs>

			<Box sx={{ py: 1 }}>
				{tab === 0 && <TabContent variableDirection="IN" />}
				{tab === 1 && <TabContent variableDirection="OUT" />}
				{tab === 2 && <TabContent variableDirection="INOUT" />}
			</Box>
		</Box>
	);
}
