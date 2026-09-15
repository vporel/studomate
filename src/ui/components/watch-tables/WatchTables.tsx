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
import { useState, WheelEvent } from "react";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";
import GrafcetsTabContent from "./GrafcetsTabContent";
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

	// MUI's scrollable Tabs only scroll via the arrow buttons or a touch/trackpad drag; a mouse
	// wheel doesn't move them by default, so vertical wheel movement is forwarded to the
	// horizontal scroller here.
	const onTabsWheel = (e: WheelEvent<HTMLDivElement>) => {
		const scroller = e.currentTarget.querySelector<HTMLDivElement>(
			".MuiTabs-scroller",
		);
		if (!scroller || e.deltaY === 0) return;
		scroller.scrollLeft += e.deltaY;
	};

	return (
		<Box p={1}>
			<Header onClose={onClose} />
			<Divider sx={{ mt: 0.5, mb: 1 }} />
			<Tabs
				value={tab}
				onChange={(_, v) => setTab(v)}
				variant="scrollable"
				scrollButtons="auto"
				allowScrollButtonsMobile
				onWheel={onTabsWheel}
				sx={{ height: 30, minHeight: 0 }}
			>
				<Tab label={t("inputs")} sx={{ minHeight: 0, minWidth: 0, pt: 0.3 }} />
				<Tab label={t("outputs")} sx={{ minHeight: 0, minWidth: 0, pt: 0.3 }} />
				<Tab label={t("memories")} sx={{ minHeight: 0, minWidth: 0, pt: 0.3 }} />
				<Tab label={t("grafcets")} sx={{ minHeight: 0, minWidth: 0, pt: 0.3 }} />
			</Tabs>

			<Box sx={{ py: 1 }}>
				{tab === 0 && <TabContent variableDirection="IN" />}
				{tab === 1 && <TabContent variableDirection="OUT" />}
				{tab === 2 && <TabContent variableDirection="INOUT" />}
				{tab === 3 && <GrafcetsTabContent />}
			</Box>
		</Box>
	);
}
