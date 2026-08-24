"use client";

import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import { DEFAULT_SECTION_TITLE } from "@/schemas/ladder/ladder.schema";
import { createRandomId } from "@/ids";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Divider } from "@mui/material";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useLadderStore } from "../context/LadderContext";
import CoilSymbol from "../nodes/CoilSymbol";
import ContactSymbol from "../nodes/ContactSymbol";
import LadderSystemBlockTool from "./LadderSystemBlockTool";
import LadderTool from "./LadderTool";
import ZoomInTool from "./ZoomInTool";
import ZoomOutTool from "./ZoomOutTool";

/** Icône des outils "bloc système" (compare, assign) : un rectangle avec le nom du bloc, faute
 * de symbole graphique dédié comme pour un contact/une bobine. */
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
 * Outils de dépose (contact NO/NF/P/N, bobine normal/set/reset, compare, assign) : on drague
 * l'icône, on la lâche sur le canevas — la cible (insertion, branche parallèle, nouveau réseau)
 * est résolue par accrochage à la grille, pas de zone de dépôt dédiée. Un réseau ne peut pas être
 * vide : il n'existe qu'à partir du moment où un premier élément y est déposé, d'où l'absence de
 * bouton dédié pour en créer un. Compare/assign sont des blocs système (voir
 * `LadderSystemBlockTool`) : une deuxième façon de les poser, en plus du glisser-déposer depuis
 * "Blocs systèmes" de l'explorateur — même comportement (ouverture de la popup avant insertion).
 */
const LadderToolbar = ({ style }: { style?: React.CSSProperties }) => {
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);
	const mode = useProjectStore((state) => state.mode);

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
				<LadderTool element={{ type: "contact", mode: "NO" }}>
					<ContactSymbol mode="NO" />
				</LadderTool>
				<LadderTool element={{ type: "contact", mode: "NF" }}>
					<ContactSymbol mode="NF" />
				</LadderTool>
				<LadderTool element={{ type: "contact", mode: "P" }}>
					<ContactSymbol mode="P" />
				</LadderTool>
				<LadderTool element={{ type: "contact", mode: "N" }}>
					<ContactSymbol mode="N" />
				</LadderTool>
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				<LadderTool element={{ type: "coil", mode: "normal" }}>
					<CoilSymbol mode="normal" />
				</LadderTool>
				<LadderTool element={{ type: "coil", mode: "set" }}>
					<CoilSymbol mode="set" />
				</LadderTool>
				<LadderTool element={{ type: "coil", mode: "reset" }}>
					<CoilSymbol mode="reset" />
				</LadderTool>
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				<LadderSystemBlockTool blockType="compare" width={68}>
					<SystemBlockToolLabel>COMPARE</SystemBlockToolLabel>
				</LadderSystemBlockTool>
				<LadderSystemBlockTool blockType="assign" width={54}>
					<SystemBlockToolLabel>ASSIGN</SystemBlockToolLabel>
				</LadderSystemBlockTool>
				<Divider orientation="vertical" style={{ margin: "5px" }} />
				<Button
					size="small"
					startIcon={<AddIcon />}
					onClick={addSection}
					disabled={mode !== ProjectMode.DESIGN}
				>
					Section
				</Button>
			</FlexBox>
			<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
				<ZoomInTool />
				<ZoomOutTool />
			</FlexBox>
		</FlexBox>
	);
};

export default LadderToolbar;
