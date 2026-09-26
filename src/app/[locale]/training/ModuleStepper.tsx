"use client";

import routes from "@/app/routes";
import type { PublicPathname } from "@/i18n/routing";
import TrainingProgressRepository from "@/persistence/repositories/training-progress.repository";
import PublicLinkButton from "@/ui/components/public-pages/PublicLinkButton";
import MarkdownBody from "@/ui/lib/markdown-body";
import CheckIcon from "@mui/icons-material/Check";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
	alpha,
	Avatar,
	Button,
	Paper,
	Stack,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { blue } from "@mui/material/colors";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";

const ACCENT_BACKGROUND = alpha(blue[700], 0.05);

const KIND_ICONS = {
	theory: MenuBookIcon,
	exercise: PlayCircleIcon,
	synthesis: FactCheckIcon,
} as const;

export type StepKind = keyof typeof KIND_ICONS;

export type StepData = {
	/** Identifiant stable de l'étape (ex. `"exercise-linear"`) — sert d'ancre d'URL et de clé de
	 * reprise de progression : ne dépend pas de la position dans `steps`, insensible à
	 * l'ajout/réordonnancement d'étapes. */
	id: string;
	title: string;
	/** Blocs Markdown (paragraphe, liste...), joints par une ligne vide avant rendu. */
	body: string[];
	kind: StepKind;
	cta?: {
		templateId: string;
		exerciseLabel: string;
		solutionLabel?: string;
		/** Mode ouvert par `exerciseLabel` — `"solution"` pour un pas d'observation d'un projet
		 * déjà résolu plutôt que d'un énoncé vierge. Par défaut `"exercise"`. */
		primaryMode?: "exercise" | "solution";
		/** Démarre directement la simulation à l'ouverture du template depuis `exerciseLabel`,
		 * plutôt que de laisser l'utilisateur basculer lui-même Conception → Simulation. */
		autostartSimulation?: boolean;
	};
};

function hashForStep(step: StepData): string {
	return `#step-${step.id}`;
}

function stepIndexFromHash(hash: string, steps: StepData[]): number | null {
	const match = /^#step-(.+)$/.exec(hash);
	if (!match) return null;
	const index = steps.findIndex((s) => s.id === match[1]);
	return index === -1 ? null : index;
}

const SummaryItem = ({
	step,
	number,
	active,
	completed,
	disabled,
	onClick,
}: {
	step: StepData;
	number: number;
	active: boolean;
	completed: boolean;
	disabled: boolean;
	onClick: () => void;
}) => (
	<Stack
		component="button"
		type="button"
		disabled={disabled}
		direction="row"
		alignItems="center"
		gap={1.5}
		onClick={onClick}
		aria-current={active ? "step" : undefined}
		sx={{
			border: "none",
			cursor: disabled ? "not-allowed" : "pointer",
			opacity: disabled ? 0.5 : 1,
			textAlign: "left",
			px: 1.5,
			py: 1,
			borderRadius: 1.5,
			bgcolor: active ? ACCENT_BACKGROUND : "transparent",
			"&:hover": { bgcolor: active ? ACCENT_BACKGROUND : "action.hover" },
		}}
	>
		<Avatar
			sx={{
				width: 28,
				height: 28,
				fontSize: "0.8rem",
				fontWeight: 700,
				bgcolor: completed
					? "success.main"
					: active
						? "primary.main"
						: "grey.200",
				color: completed
					? "success.contrastText"
					: active
						? "primary.contrastText"
						: "text.secondary",
			}}
		>
			{completed ? <CheckIcon sx={{ fontSize: 18 }} /> : number}
		</Avatar>
		<Typography
			variant="body2"
			fontWeight={active || step.kind === "synthesis" ? 700 : 400}
			color={active ? "primary.main" : "text.primary"}
		>
			{step.title}
		</Typography>
	</Stack>
);

export default function ModuleStepper({
	steps,
	prevLabel,
	nextLabel,
	moduleId,
	nextModule,
}: {
	steps: StepData[];
	prevLabel: string;
	nextLabel: string;
	/** Clé de module (ex. `"m1"`) — sert de clé de reprise de progression, distincte de l'id de
	 * chaque étape. */
	moduleId: string;
	/** Module suivant du parcours, s'il est disponible — remplace le bouton "Suivant" (désactivé
	 * par défaut) sur la dernière étape par un lien vers ce module. */
	nextModule?: { href: PublicPathname; label: string };
}) {
	const [activeIndex, setActiveIndex] = useState(0);
	const contentRef = useRef<HTMLDivElement>(null);
	const theme = useTheme();
	// Below `md` the summary and the content stack vertically, so the content can be off-screen
	// after picking a step — scrolling it into view isn't needed once they sit side by side.
	const isStackedLayout = useMediaQuery(theme.breakpoints.down("md"));

	// La plus grande étape jamais atteinte pour ce module (hash ou progression sauvegardée) :
	// la sauvegarde ne redescend jamais en dessous, même si l'utilisateur revient en arrière
	// pour relire une étape. Sert aussi à verrouiller/cocher le sommaire —
	// sans verrouillage, un saut direct à une étape avancée ferait cocher à tort les précédentes.
	const [furthestIndex, setFurthestIndex] = useState(0);

	// Le hash de l'URL garde la priorité pour l'affichage (lien direct vers une étape) ; sinon,
	// reprend la dernière étape sauvegardée pour ce module.
	useEffect(() => {
		const hashIndex = stepIndexFromHash(window.location.hash, steps);
		if (hashIndex !== null) setActiveIndex(hashIndex);

		let cancelled = false;
		const stepIds = steps.map((s) => s.id);
		void new TrainingProgressRepository()
			.getStepId(moduleId, stepIds)
			.then((stepId) => {
				if (cancelled) return;
				const savedIndex = stepId ? stepIds.indexOf(stepId) : -1;
				setFurthestIndex(Math.max(hashIndex ?? -1, savedIndex, 0));
				if (hashIndex === null && savedIndex !== -1) setActiveIndex(savedIndex);
			});
		return () => {
			cancelled = true;
		};
	}, [steps, moduleId]);

	const goTo = (index: number) => {
		setActiveIndex(index);
		window.history.replaceState(null, "", hashForStep(steps[index]));
		if (isStackedLayout) {
			contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}
		if (index > furthestIndex) {
			setFurthestIndex(index);
			void new TrainingProgressRepository().saveStepId(moduleId, steps[index].id);
		}
	};

	const step = steps[activeIndex];
	const Icon = KIND_ICONS[step.kind];

	return (
		<Stack direction={{ xs: "column", md: "row" }} gap={3} alignItems="flex-start">
			<Stack
				gap={0.5}
				sx={{
					width: { xs: "100%", md: 280 },
					flexShrink: 0,
					position: { md: "sticky" },
					top: { md: 16 },
				}}
			>
				{steps.map((s, i) => (
					<SummaryItem
						key={i}
						step={s}
						number={i + 1}
						active={i === activeIndex}
						completed={i < furthestIndex}
						disabled={i > furthestIndex}
						onClick={() => goTo(i)}
					/>
				))}
			</Stack>

			<Paper
				ref={contentRef}
				variant="outlined"
				sx={{
					p: { xs: 2, sm: 3 },
					borderRadius: 3,
					flex: 1,
					width: "100%",
					bgcolor: step.cta ? ACCENT_BACKGROUND : "background.paper",
					borderLeft: step.cta ? "4px solid" : undefined,
					borderLeftColor: step.cta ? "primary.main" : undefined,
				}}
			>
				<Stack direction="row" alignItems="center" gap={1} mb={1.5}>
					<Icon fontSize="small" color={step.cta ? "primary" : "disabled"} />
					<Typography variant="h5" component="h2" fontWeight={700}>
						{step.title}
					</Typography>
				</Stack>

				<MarkdownBody
					source={step.body.join("\n\n")}
					sx={{ "& p": { textAlign: "justify" } }}
				/>

				{step.cta && (
					<Stack direction="row" gap={1.5} flexWrap="wrap" mt={2}>
						<Button
							LinkComponent={NextLink}
							href={`${routes.app()}?template=${step.cta.templateId}${
								step.cta.primaryMode === "solution" ? "&template-mode=solution" : ""
							}${step.cta.autostartSimulation ? "&template-autostart=simulation" : ""}`}
							target="_blank"
							variant="contained"
						>
							{step.cta.exerciseLabel}
						</Button>
						{step.cta.solutionLabel && (
							<Button
								LinkComponent={NextLink}
								href={`${routes.app()}?template=${step.cta.templateId}&template-mode=solution`}
								target="_blank"
								variant="outlined"
							>
								{step.cta.solutionLabel}
							</Button>
						)}
					</Stack>
				)}

				<Stack direction="row" justifyContent="flex-end" gap={1.5} mt={3}>
					<Button
						onClick={() => goTo(activeIndex - 1)}
						disabled={activeIndex === 0}
						startIcon={<NavigateBeforeIcon />}
					>
						{prevLabel}
					</Button>
					{activeIndex === steps.length - 1 && nextModule ? (
						<PublicLinkButton
							href={nextModule.href}
							endIcon={<NavigateNextIcon />}
							variant="contained"
						>
							{nextModule.label}
						</PublicLinkButton>
					) : (
						<Button
							onClick={() => goTo(activeIndex + 1)}
							disabled={activeIndex === steps.length - 1}
							endIcon={<NavigateNextIcon />}
							variant="contained"
						>
							{nextLabel}
						</Button>
					)}
				</Stack>
			</Paper>
		</Stack>
	);
}
