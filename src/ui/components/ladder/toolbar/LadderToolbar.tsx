"use client";

import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import { DEFAULT_SECTION_TITLE } from "@/schemas/ladder/ladder.schema";
import { createRandomId } from "@/ids";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Divider } from "@mui/material";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
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
 * Outils de dépose (contact NO/NF/P/N, bobine normal/set/reset, compare, assign, arithmetic) :
 * on drague l'icône, on la lâche sur le canevas — la cible (insertion, branche parallèle, nouveau
 * réseau) est résolue par accrochage à la grille, pas de zone de dépôt dédiée. Un réseau ne peut
 * pas être vide : il n'existe qu'à partir du moment où un premier élément y est déposé, d'où
 * l'absence de bouton dédié pour en créer un. Compare/assign/arithmetic sont des blocs système
 * (voir `LadderSystemBlockTool`) : une deuxième façon de les poser, en plus du glisser-déposer
 * depuis "Blocs systèmes" de l'explorateur — même comportement (insertion d'un bloc vide,
 * configuré ensuite sur le canevas).
 */
const LadderToolbar = ({ style }: { style?: React.CSSProperties }) => {
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	const mode = useProjectStore((state) => state.mode);
	const t = useT("ladderEditor.toolbar");
	const tsb = useT("ladderEditor.systemBlocks");

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
			className="ladder-toolbar"
			centerVertical
			between
			style={{
				width: "100%",
				height: "38px",
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
				padding: "10px 5px",
				gap: "5px",
				...style,
			}}
		>
			<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
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
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				{SYSTEM_BLOCK_CATALOG.filter((entry) => entry.toolbar).map((entry) => (
					<LadderSystemBlockTool
						key={entry.blockType}
						blockType={entry.blockType}
						width={entry.toolbar!.width}
						label={tsb(entry.toolbar!.labelKey as never)}
					>
						<SystemBlockToolLabel>{entry.toolbar!.symbol}</SystemBlockToolLabel>
					</LadderSystemBlockTool>
				))}
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				<Button
					size="small"
					startIcon={<AddIcon />}
					onClick={addSection}
					disabled={mode !== ProjectMode.DESIGN}
				>
					{t("addSection")}
				</Button>
			</FlexBox>
		</FlexBox>
	);
};

export default LadderToolbar;
