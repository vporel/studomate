"use client";

import useCollapseOnOverflow from "@/ui/lib/hooks/useCollapseOnOverflow";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import ZoomControls from "@/ui/components/app-toolbar/ZoomControls";
import useCanEdit from "@/ui/components/projects/useCanEdit";
import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import { DEFAULT_SECTION_TITLE } from "@/schemas/ladder/ladder.schema";
import { createRandomId } from "@/ids";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Button, Divider, IconButton } from "@mui/material";
import { useRef, useState } from "react";
import ExcludedFromExecutionWarning from "@/ui/components/programs/ExcludedFromExecutionWarning";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
} from "@/ui/stores/ladder/managers/view.manager";
import { useLadderStore } from "../context/LadderContext";
import CoilSymbol from "../nodes/CoilSymbol";
import ContactSymbol from "../nodes/ContactSymbol";
import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import LadderSystemBlockTool from "./LadderSystemBlockTool";
import LadderTool from "./LadderTool";

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

/**
 * Outils de dépose (contact NO/NF/P/N, bobine normal/inversée/set/reset/front, compare, assign, arithmetic) :
 * on drague l'icône, on la lâche sur le canevas — la cible (insertion, branche parallèle, nouveau
 * réseau) est résolue par accrochage à la grille, pas de zone de dépôt dédiée. Un réseau ne peut
 * pas être vide : il n'existe qu'à partir du moment où un premier élément y est déposé, d'où
 * l'absence de bouton dédié pour en créer un. Compare/assign/arithmetic sont des blocs système
 * (voir `LadderSystemBlockTool`) : une deuxième façon de les poser, en plus du glisser-déposer
 * depuis "Blocs systèmes" de l'explorateur — même comportement (insertion d'un bloc vide,
 * configuré ensuite sur le canevas).
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
	const canEdit = useCanEdit();
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const ladderId = useLadderStore((state) => state.ladder.id);
	const excludedFromExecution = useLadderStore(
		(state) => state.ladder.excludedFromExecution,
	);
	const viewManager = useLadderStore((state) => state.viewManager);
	const zoom = useLadderStore((state) => state.zoom);
	const t = useT("ladderEditor.toolbar");
	const tsb = useT("ladderEditor.systemBlocks");
	const [extraCoilsVisible, setExtraCoilsVisible] = useState(false);
	const floatingPalette = useProjectStore(
		(state) => state.capabilities.ladder.floatingSystemBlocksPalette,
	);
	const toolbarRef = useRef<HTMLElement>(null);
	//Too narrow for the system block tools: they move into the floating box of system blocks.
	const narrow = useCollapseOnOverflow(toolbarRef);
	const compact = floatingPalette && narrow;

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
				<LadderTool
					element={{ kind: "contact", type: "NO" }}
					label={t("contactNO")}
				>
					<ContactSymbol type="NO" />
				</LadderTool>
				<LadderTool
					element={{ kind: "contact", type: "NF" }}
					label={t("contactNF")}
				>
					<ContactSymbol type="NF" />
				</LadderTool>
				<LadderTool
					element={{ kind: "contact", type: "P" }}
					label={t("contactP")}
				>
					<ContactSymbol type="P" />
				</LadderTool>
				<LadderTool
					element={{ kind: "contact", type: "N" }}
					label={t("contactN")}
				>
					<ContactSymbol type="N" />
				</LadderTool>
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				<LadderTool
					element={{ kind: "coil", type: "normal" }}
					label={t("coilNormal")}
				>
					<CoilSymbol type="normal" />
				</LadderTool>
				<LadderTool
					element={{ kind: "coil", type: "set" }}
					label={t("coilSet")}
				>
					<CoilSymbol type="set" />
				</LadderTool>
				<LadderTool
					element={{ kind: "coil", type: "reset" }}
					label={t("coilReset")}
				>
					<CoilSymbol type="reset" />
				</LadderTool>
				{extraCoilsVisible && (
					<>
						<LadderTool
							element={{ kind: "coil", type: "inverted" }}
							label={t("coilInverted")}
						>
							<CoilSymbol type="inverted" />
						</LadderTool>
						<LadderTool
							element={{ kind: "coil", type: "rising" }}
							label={t("coilRising")}
						>
							<CoilSymbol type="rising" />
						</LadderTool>
						<LadderTool
							element={{ kind: "coil", type: "falling" }}
							label={t("coilFalling")}
						>
							<CoilSymbol type="falling" />
						</LadderTool>
					</>
				)}
				<IconButton
					size="small"
					aria-label={t(
						extraCoilsVisible ? "hideExtraCoils" : "showExtraCoils",
					)}
					title={t(extraCoilsVisible ? "hideExtraCoils" : "showExtraCoils")}
					onClick={() => setExtraCoilsVisible((visible) => !visible)}
					sx={{ p: 0.25 }}
				>
					{extraCoilsVisible ? (
						<ChevronLeftIcon fontSize="small" />
					) : (
						<ChevronRightIcon fontSize="small" />
					)}
				</IconButton>
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				{!compact &&
					SYSTEM_BLOCK_CATALOG.filter((entry) => entry.toolbar).map((entry) => (
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
				{floatingPalette && (
					<Button
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
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				<Button
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
				{excludedFromExecution && (
					<ExcludedFromExecutionWarning
						includeDisabled={!canEdit}
						onInclude={() =>
							laddersManager.setExcludedFromExecution(ladderId, false)
						}
					/>
				)}
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
