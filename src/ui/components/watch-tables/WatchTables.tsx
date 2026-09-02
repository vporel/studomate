"use client";

import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	Divider,
	IconButton,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";
import TabContent from "./TabContent";

function Header({ onClose }: { onClose: () => void }) {
	const t = useT("pages.watchTables");
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<Typography variant="h6">{t("heading")}</Typography>
			<Tooltip title={t("close")}>
				<IconButton
					onClick={onClose}
					size="small"
					aria-label="close-watch-tables"
				>
					<CloseIcon />
				</IconButton>
			</Tooltip>
		</Box>
	);
}

export default function WatchTables() {
	const t = useT("pages.watchTables");
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
				<Tab label={t("inputs")} sx={{ minHeight: 0, pt: 0.3 }} />
				<Tab label={t("outputs")} sx={{ minHeight: 0, pt: 0.3 }} />
				<Tab label={t("memories")} sx={{ minHeight: 0, pt: 0.3 }} />
			</Tabs>

			<Box sx={{ py: 1 }}>
				{tab === 0 && <TabContent variableDirection="IN" />}
				{tab === 1 && <TabContent variableDirection="OUT" />}
				{tab === 2 && <TabContent variableDirection="INOUT" />}
			</Box>
		</Box>
	);
}
