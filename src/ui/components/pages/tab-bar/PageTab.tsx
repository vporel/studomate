"use client";

import InclinedAccountTreeIcon from "@/ui/components/icons/InclinedAccountTree";
import LadderIcon from "@/ui/components/icons/LadderIcon";
import LadderMainIcon from "@/ui/components/icons/LadderMainIcon";
import ExerciseIcon from "@/ui/components/icons/ExerciseIcon";
import ProjectStartupIcon from "@/ui/components/icons/ProjectStartupIcon";
import ProjectPropertiesIcon from "@/ui/components/icons/ProjectPropertiesIcon";
import VariablesIcon from "@/ui/components/icons/VariablesIcon";
import HmiIcon from "@/ui/components/icons/HmiIcon";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { PageType } from "@/ui/stores/project/project.store";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import {
	alpha,
	Box,
	IconButton,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { ElementType } from "react";
import { useShallow } from "zustand/shallow";

/**
 * Icône par type d'onglet — un `Record` exhaustif sur `Exclude<PageType, "ladder">` (le ladder
 * a sa propre icône selon qu'il est le Main) : ajouter un `PageType` sans l'y référencer est une
 * erreur de compilation, pas un onglet silencieusement affiché avec la mauvaise icône.
 */
const TYPE_ICONS: Record<Exclude<PageType, "ladder">, ElementType> = {
	"project-startup": ProjectStartupIcon,
	"project-properties": ProjectPropertiesIcon,
	preferences: SettingsIcon,
	exercise: ExerciseIcon,
	grafcet: InclinedAccountTreeIcon,
	variables: VariablesIcon,
	hmi: HmiIcon,
	"hmi-simulation": HmiIcon,
};

export type PageTabProps = {
	id: string;
	title: string;
	type: PageType;
};

import { useT } from "@/ui/i18n/useT";
import { usePageTitle } from "../usePageTitle";

const PageTab = ({ id, title, type }: PageTabProps) => {
	const pageTitle = usePageTitle();
	const t = useT("pages.tabBar");
	const th = useTheme();
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const { activePageId } = useProjectStore(
		useShallow((state) => ({
			activePageId: state.activePageId,
		})),
	);
	// Le Main a sa propre icône dans l'onglet, comme dans l'explorateur (voir `getProgramIcon`
	// d'`ExplorerProgramsItems`) : l'id de page d'un ladder est son id de programme.
	const isMain = useProjectStore(
		(state) => type === "ladder" && state.project?.ladders[id]?.role === "main",
	);
	const active = id === activePageId;
	const TypeIconComponent =
		type === "ladder"
			? isMain
				? LadderMainIcon
				: LadderIcon
			: TYPE_ICONS[type];

	const {
		setNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, attributes: { role: "tab" } });

	return (
		<Box
			ref={setNodeRef}
			className="pages__tab"
			data-page-id={id}
			aria-selected={active}
			{...attributes}
			{...listeners}
			sx={{
				height: "100%",
				width: "fit-content",
				padding: "5px 5px 5px 10px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "10px",
				cursor: "pointer",
				userSelect: "none",
				transform: CSS.Transform.toString(transform),
				transition: [transition, "background-color .2s ease", "color .2s ease"]
					.filter(Boolean)
					.join(", "),
				opacity: isDragging ? 0.5 : 1,
				zIndex: isDragging ? 1 : "auto",
				position: "relative",
				backgroundColor: !active ? "white" : alpha(th.palette.primary.main, 1),
				color: !active ? th.palette.text.primary : "white",
				borderRight: "1px solid rgba(0, 0, 0, 0.1)",
				":hover": {
					backgroundColor: !active
						? "#dfdfdf"
						: alpha(th.palette.primary.main, 1),
					color: !active ? th.palette.text.primary : "white",
					".page__tab__type-icon": {
						color: !active ? th.palette.primary.main : "white",
					},
					".page__tab__button-icon": { opacity: 1 },
					".circle-icon": { display: "none" },
					".close-icon": { display: "block" },
				},
			}}
			onClick={() => {
				pagesManager.setActivePage(id);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					pagesManager.setActivePage(id);
				}
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
				<TypeIconComponent
					className="page__tab__type-icon"
					sx={{
						color: active ? "white" : th.palette.primary.main,
						fontSize: "1.2rem",
					}}
				/>
				<Typography component="span" sx={{ fontSize: "0.85rem" }}>
					{pageTitle({ id, title, type })}
				</Typography>
			</Box>
			{/* La "Simulation HMI" est un onglet unique, réouvert via le bouton de la bottom bar
			(voir `RightActions`) — jamais fermable, pour rester à portée en un clic. */}
			{type !== "hmi-simulation" && (
				<Tooltip title={t("close")}>
					<IconButton
						className="page__tab__button-icon"
						aria-label={t("closeAria")}
						sx={{
							opacity: active ? 1 : 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							padding: "3px",
							borderRadius: "5px",
							color: !active ? th.palette.text.primary : "white",
							":hover": {
								background: !active ? "#cfcfcf" : "rgba(255, 255, 255, 0.2)",
							},
						}}
						onPointerDown={(e) => e.stopPropagation()}
						onClick={(e) => {
							e.stopPropagation();
							pagesManager.closePage(id);
						}}
					>
						<CloseIcon
							className="close-icon"
							sx={{ fontSize: "0.9rem", display: "block" }}
						/>
					</IconButton>
				</Tooltip>
			)}
		</Box>
	);
};

export default PageTab;
