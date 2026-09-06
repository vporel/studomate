"use client";

import CrossReferenceMapper, {
	CrossReferenceLocation,
} from "@/bridge/cross-reference.mapper";
import CrossReferenceCollector from "@/project-analyser/cross-reference/cross-reference-collector";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import ResizableFixedBox from "@/ui/lib/mui/ResizableFixedBox";
import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	Divider,
	IconButton,
	List,
	ListItemButton,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useProjectStore } from "../ProjectContext";
import useGotoProgram from "../useGotoProgram";

type GotoLocation = (location: CrossReferenceLocation) => void;

function LocationGroup({
	title,
	emptyLabel,
	locations,
	onGoto,
}: {
	title: string;
	emptyLabel: string;
	locations: CrossReferenceLocation[];
	onGoto: GotoLocation;
}) {
	return (
		<Box sx={{ ml: 2, mt: 0.5 }}>
			<Typography variant="caption" color="text.secondary">
				{title}
			</Typography>
			{locations.length === 0 ? (
				<Typography variant="body2" sx={{ ml: 1, fontStyle: "italic" }}>
					{emptyLabel}
				</Typography>
			) : (
				<List dense disablePadding>
					{locations.map((location, index) => (
						<ListItemButton
							key={`${location.locationId}-${index}`}
							dense
							onClick={() => onGoto(location)}
						>
							<Typography variant="body2">{location.label}</Typography>
						</ListItemButton>
					))}
				</List>
			)}
		</Box>
	);
}

/**
 * Coquille : ne monte le panneau (et donc la collecte des références) que lorsqu'il est ouvert.
 * Le composant reste abonné à `project`, un projet édité panneau fermé ne recalcule donc rien.
 */
export default function CrossReferenceResult() {
	const visible = useProjectStore((s) => s.ui.crossReferenceResultVisible);
	if (!visible) return null;
	return <CrossReferencePanel />;
}

/**
 * Panneau « Références croisées » : pour chaque variable, ses lecteurs et ses écrivains, avec
 * navigation vers l'élément concerné. Recalculé à chaque rendu du projet tant qu'il est ouvert
 * (coût par ouverture, pas de cache — cf. CLAUDE.md).
 */
function CrossReferencePanel() {
	const t = useT("crossReference");
	const setVisible = useProjectStore((s) => s.setCrossReferenceResultVisible);
	const project = useProjectStore((s) => s.project);
	const filter = useProjectStore((s) => s.crossReferenceFilter);
	const setFilter = useProjectStore((s) => s.setCrossReferenceFilter);
	const pagesManager = useProjectStore((s) => s.pagesManager);
	const { locale } = useLocaleContext();
	const onGotoProgram = useGotoProgram();

	const gotoLocation = (location: CrossReferenceLocation) => {
		if (location.programType === "hmi") {
			pagesManager.openPage({
				id: location.programId,
				type: "hmi",
				title: project?.getHmiPage(location.programId)?.name ?? "",
			});
			return;
		}
		onGotoProgram(
			location.programId,
			location.programType,
			location.locationId,
		);
	};

	const rows = useMemo(() => {
		if (!project) return [];
		return CrossReferenceMapper.analyserToApp(
			CrossReferenceCollector.collect(project),
			project,
			locale,
		);
	}, [project, locale]);

	const needle = filter.trim().toLowerCase();
	const filteredRows = needle
		? rows.filter((row) => row.variableName.toLowerCase().includes(needle))
		: rows;

	return (
		<ResizableFixedBox
			position="bottom"
			initialSize={350}
			offset={30}
			contentContainerProps={{
				sx: { px: 2, py: 1, display: "flex", flexDirection: "column" },
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Typography variant="h6">{t("panelTitle")}</Typography>
				<Tooltip title={t("close")}>
					<IconButton
						onClick={() => setVisible(false)}
						size="small"
						aria-label="close-cross-references"
					>
						<CloseIcon />
					</IconButton>
				</Tooltip>
			</Box>
			<Divider sx={{ my: 1 }} />
			<TextField
				size="small"
				variant="standard"
				placeholder={t("filterPlaceholder")}
				value={filter}
				onChange={(event) => setFilter(event.target.value)}
				sx={{ mb: 1 }}
			/>
			<Box sx={{ overflow: "auto", flex: 1 }}>
				{rows.length === 0 && (
					<Typography sx={{ p: 2 }}>{t("noVariables")}</Typography>
				)}
				{rows.length > 0 && filteredRows.length === 0 && (
					<Typography sx={{ p: 2 }}>{t("noMatch")}</Typography>
				)}
				{filteredRows.map((row) => (
					<Box key={row.variableName} sx={{ mb: 1.5 }}>
						<Typography variant="subtitle1" sx={{ fontFamily: "monospace" }}>
							{row.variableName}
						</Typography>
						<LocationGroup
							title={t("writtenBy")}
							emptyLabel={t("noWriters")}
							locations={row.writers}
							onGoto={gotoLocation}
						/>
						<LocationGroup
							title={t("readBy")}
							emptyLabel={t("noReaders")}
							locations={row.readers}
							onGoto={gotoLocation}
						/>
					</Box>
				))}
			</Box>
		</ResizableFixedBox>
	);
}
