"use client";

import { createRandomId } from "@/ids";
import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import { DEFAULT_SECTION_TITLE } from "@/schemas/ladder/ladder.schema";
import type { CoilType, ContactType } from "@/schemas/ladder/element.schema";
import ZoomControls from "@/ui/components/app-toolbar/ZoomControls";
import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import AnalyserToolbarItem from "@/ui/components/programs/AnalyserToolbarItem";
import ExportProgramTool from "@/ui/components/programs/ExportProgramTool";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import { useT } from "@/ui/i18n/useT";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import useCollapseOnOverflow from "@/ui/lib/hooks/useCollapseOnOverflow";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
} from "@/ui/stores/ladder/managers/view.manager";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import { Box, Button, Divider, IconButton } from "@mui/material";
import { useCallback, useRef, useState } from "react";
import { useLadderStore, useLadderStoreApi } from "../context/LadderContext";
import CoilSymbol from "../nodes/CoilSymbol";
import ContactSymbol from "../nodes/ContactSymbol";
import LadderSystemBlockTool from "./LadderSystemBlockTool";
import LadderTool from "./LadderTool";
import useLadderToolAvailable from "./useLadderToolAvailable";

/** Icône des outils "bloc système" (compare, assign, arithmetic) : un rectangle avec le nom du
 * bloc, faute de symbole graphique dédié comme pour un contact/une bobine. */
const SystemBlockToolLabel = ({ children }: { children: React.ReactNode }) => (
	<Box
		sx={{
			width: "100%",
			height: "100%",
			border: "1.5px solid black",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: 9,
			fontWeight: 700,
		}}
	>
		{children}
	</Box>
);

const CONTACT_TOOLS = [
	{ type: "NO", labelKey: "contactNO" },
	{ type: "NF", labelKey: "contactNF" },
	{ type: "P", labelKey: "contactP" },
	{ type: "N", labelKey: "contactN" },
] as const satisfies { type: ContactType; labelKey: string }[];

const MAIN_COIL_TOOLS = [
	{ type: "normal", labelKey: "coilNormal" },
	{ type: "set", labelKey: "coilSet" },
	{ type: "reset", labelKey: "coilReset" },
] as const satisfies { type: CoilType; labelKey: string }[];

const EXTRA_COIL_TOOLS = [
	{ type: "inverted", labelKey: "coilInverted" },
	{ type: "rising", labelKey: "coilRising" },
	{ type: "falling", labelKey: "coilFalling" },
] as const satisfies { type: CoilType; labelKey: string }[];

/**
 * Drop tools (contacts NO/NF/P/N, coils normal/inverted/set/reset/edge, system blocks, CALL): the
 * icon is dragged and released on the canvas, and the target (insertion, parallel branch, new
 * network) is resolved by snapping to the grid, with no dedicated drop zone. A network cannot be
 * empty: it only exists once a first element is dropped in it, hence no button to create one. The
 * system blocks and CALL are placed through `LadderSystemBlockTool`: a second way to place them,
 * besides dragging from the explorer's "Library". The blocks without a configuration window are
 * inserted empty and configured on the canvas; the CALL block opens a window to pick the ladder
 * it calls.
 */
const LadderToolbar = ({
	style,
	systemBlocksPaletteOpen,
	onToggleSystemBlocksPalette,
}: {
	style?: React.CSSProperties;
	systemBlocksPaletteOpen: boolean;
	onToggleSystemBlocksPalette: () => void;
}) => {
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	const canEdit = useCanEditActivePage();
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const simulating = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);
	const exclusionToggleAvailable = useProjectStore(
		(state) => state.capabilities.programExecutionExclusionToggle,
	);
	const ladderStore = useLadderStoreApi();
	const ladderId = useLadderStore((state) => state.ladder.id);
	const getExportConfig = useCallback(
		(): PdfExportProgramConfig => ({
			type: "ladder",
			program: ladderStore.getState().ladder,
		}),
		[ladderStore],
	);
	const excludedFromExecution = useLadderStore(
		(state) => state.ladder.excludedFromExecution,
	);
	const canBeExcludedFromExecution = useLadderStore((state) =>
		state.ladder.canBeExcludedFromExecution(),
	);
	const viewManager = useLadderStore((state) => state.viewManager);
	const zoom = useLadderStore((state) => state.zoom);
	const t = useT("ladderEditor.toolbar");
	const tsb = useT("ladderEditor.systemBlocks");
	const [extraCoilsVisible, setExtraCoilsVisible] = useState(false);
	const toolbarRef = useRef<HTMLElement>(null);
	//Too narrow for the system block tools: they move into the floating box of system blocks.
	const compact = useCollapseOnOverflow(toolbarRef);
	const isToolAvailable = useLadderToolAvailable();
	const contactTools = CONTACT_TOOLS.filter(({ type }) =>
		isToolAvailable(`contact-${type}`),
	);
	const mainCoilTools = MAIN_COIL_TOOLS.filter(({ type }) =>
		isToolAvailable(`coil-${type}`),
	);
	const extraCoilTools = EXTRA_COIL_TOOLS.filter(({ type }) =>
		isToolAvailable(`coil-${type}`),
	);
	const coilToolsVisible = mainCoilTools.length + extraCoilTools.length > 0;
	const elementToolsVisible = contactTools.length > 0 || coilToolsVisible;
	const systemBlockTools = SYSTEM_BLOCK_CATALOG.filter(
		(entry) => entry.toolbar && isToolAvailable(entry.blockType),
	);
	const callToolVisible = isToolAvailable("user-program");
	const paletteButtonVisible = SYSTEM_BLOCK_CATALOG.some((entry) =>
		isToolAvailable(entry.blockType),
	);

	const addSection = () => {
		commandsStackManager.executeOperation([
			new SectionAddCommand({
				sectionId: createRandomId(),
				title: DEFAULT_SECTION_TITLE,
				description: "",
			}),
		]);
	};

	return (
		<FlexBox
			ref={toolbarRef}
			className="ladder-toolbar"
			centerVertical
			between
			style={{
				width: "100%",
				height: "38px",
				overflowX: "auto",
				overflowY: "hidden",
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
				padding: "10px 5px",
				gap: "5px",
				...style,
			}}
		>
			<FlexBox
				centerVertical
				sx={{ gap: "5px", height: "100%", flexShrink: 0 }}
			>
				{elementToolsVisible && (
					<>
						<FlexBox
							data-tour="toolbar"
							centerVertical
							sx={{ gap: "5px", height: "100%" }}
						>
							{contactTools.map(({ type, labelKey }) => (
								<LadderTool
									key={type}
									element={{ kind: "contact", type }}
									label={t(labelKey)}
								>
									<ContactSymbol type={type} />
								</LadderTool>
							))}
							{contactTools.length > 0 && coilToolsVisible && (
								<Divider orientation="vertical" style={{ margin: "5px" }} />
							)}
							{[
								...mainCoilTools,
								...(extraCoilsVisible ? extraCoilTools : []),
							].map(({ type, labelKey }) => (
								<LadderTool
									key={type}
									element={{ kind: "coil", type }}
									label={t(labelKey)}
								>
									<CoilSymbol type={type} />
								</LadderTool>
							))}
							{extraCoilTools.length > 0 && (
								<IconButton
									size="small"
									aria-label={t(
										extraCoilsVisible ? "hideExtraCoils" : "showExtraCoils",
									)}
									title={t(
										extraCoilsVisible ? "hideExtraCoils" : "showExtraCoils",
									)}
									onClick={() => setExtraCoilsVisible((visible) => !visible)}
									sx={{ p: 0.25 }}
								>
									{extraCoilsVisible ? (
										<ChevronLeftIcon fontSize="small" />
									) : (
										<ChevronRightIcon fontSize="small" />
									)}
								</IconButton>
							)}
						</FlexBox>
						<Divider orientation="vertical" style={{ margin: "5px" }} />
					</>
				)}
				{!compact &&
					systemBlockTools.map((entry) => (
						<LadderSystemBlockTool
							key={entry.blockType}
							blockType={entry.blockType}
							width={entry.toolbar!.width}
							label={tsb(entry.toolbar!.labelKey as never)}
						>
							<SystemBlockToolLabel>
								{entry.toolbar!.symbol}
							</SystemBlockToolLabel>
						</LadderSystemBlockTool>
					))}
				{callToolVisible && (
					<LadderSystemBlockTool
						blockType="user-program"
						width={50}
						label={tsb("callToolbarLabel")}
					>
						<SystemBlockToolLabel>CALL</SystemBlockToolLabel>
					</LadderSystemBlockTool>
				)}
				{paletteButtonVisible && (
					<Button
						data-tour="systemBlocks"
						size="small"
						startIcon={<WidgetsOutlinedIcon />}
						aria-pressed={systemBlocksPaletteOpen}
						onClick={onToggleSystemBlocksPalette}
						disabled={!canEdit}
						sx={{ whiteSpace: "nowrap" }}
					>
						{t("systemBlocksButton")}
					</Button>
				)}
				{(callToolVisible || paletteButtonVisible) && (
					<Divider orientation="vertical" style={{ margin: "5px" }} />
				)}
				<Button
					data-tour="addSection"
					size="small"
					startIcon={<AddIcon />}
					onClick={addSection}
					disabled={!canEdit}
				>
					{t("addSection")}
				</Button>
			</FlexBox>
			<FlexBox
				centerVertical
				sx={{ gap: "5px", height: "100%", flexShrink: 0 }}
			>
				{(excludedFromExecution || canBeExcludedFromExecution) && (
					<AnalyserToolbarItem
						excluded={excludedFromExecution}
						simulating={simulating}
						toggleAvailable={exclusionToggleAvailable}
						disabled={!canEdit}
						onToggle={(excluded) =>
							laddersManager.setExcludedFromExecution(ladderId, excluded)
						}
					/>
				)}
				<ExportProgramTool getConfig={getExportConfig} />
				<ZoomControls
					zoom={zoom}
					zoomInLabel={t("zoomIn")}
					zoomOutLabel={t("zoomOut")}
					canZoomIn={zoom < LADDER_FLOW_MAX_ZOOM}
					canZoomOut={zoom > LADDER_FLOW_MIN_ZOOM}
					onZoomIn={() => viewManager.zoomIn()}
					onZoomOut={() => viewManager.zoomOut()}
				/>
			</FlexBox>
		</FlexBox>
	);
};

export default LadderToolbar;
