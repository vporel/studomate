"use client";

import { APP_NAME, APP_REPO_URL } from "@/app-info";
import routes from "@/app/routes";
import { Link } from "@/i18n/navigation";
import { TRAINING_MODULE_IDS } from "@/training/module-ids";
import { PROJECT_TEMPLATES, type TemplateId } from "@/templates/index";
import { useLocale } from "next-intl";
import { useT } from "@/ui/i18n/useT";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import BoltIcon from "@mui/icons-material/Bolt";
import CastForEducationIcon from "@mui/icons-material/CastForEducation";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import GitHubIcon from "@mui/icons-material/GitHub";
import HubIcon from "@mui/icons-material/Hub";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import RuleIcon from "@mui/icons-material/Rule";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import {
	Box,
	Button,
	Chip,
	Container,
	Link as MuiLink,
	Paper,
	SvgIconProps,
	SxProps,
	Theme,
	Typography,
	alpha,
} from "@mui/material";
import NextLink from "next/link";
import { ComponentType } from "react";
import DemoVideo from "./DemoVideo";
import Illustration3dSlot from "@/ui/components/3d-illustrations/Illustration3dSlot";
import {
	arduinoPhoto,
	featureKeys,
	grafcetCapture,
	hmiCapture,
	ladderCapture,
	scene3dCapture,
	logicShowcaseKeys,
	machineShowcaseKeys,
	showcaseKeys,
} from "./landing-content";

const OpenAppButton = ({
	label,
	size = "large",
	variant = "contained",
	onPrimary = false,
}: {
	label: string;
	size?: "medium" | "large";
	variant?: "contained" | "outlined";
	/** White button for a primary-coloured background. */
	onPrimary?: boolean;
}) => (
	<Button
		LinkComponent={NextLink}
		href={routes.app()}
		size={size}
		variant={variant}
		startIcon={<PlayArrowIcon />}
		sx={
			onPrimary
				? {
						bgcolor: "common.white",
						color: "primary.main",
						"&:hover": { bgcolor: "grey.100" },
					}
				: undefined
		}
	>
		{label}
	</Button>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<Typography
		variant="h3"
		component="h2"
		textAlign="center"
		fontWeight={700}
		mb={4}
		sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" } }}
	>
		{children}
	</Typography>
);

const CardTitle = ({
	children,
	mt,
}: {
	children: React.ReactNode;
	mt?: number;
}) => (
	<Typography
		variant="h6"
		component="h3"
		fontWeight={700}
		mt={mt}
		sx={{ fontSize: "1.15rem" }}
	>
		{children}
	</Typography>
);

type SectionTone = "plain" | "muted" | "primary";

const sectionStyles: Record<SectionTone, SxProps<Theme>> = {
	plain: { background: (th) => th.palette.background.paper },
	muted: { background: "#f1f5f9", borderBlock: "1px solid #e2e8f0" },
	primary: {
		background: (th) => th.palette.primary.main,
		color: "primary.contrastText",
	},
};

const Section = ({
	tone = "plain",
	maxWidth = "lg",
	centered = false,
	children,
}: {
	tone?: SectionTone;
	maxWidth?: "md" | "lg";
	centered?: boolean;
	children: React.ReactNode;
}) => (
	<Box component="section" sx={sectionStyles[tone]}>
		<Container
			maxWidth={maxWidth}
			sx={{
				py: { xs: 6, md: 8 },
				textAlign: centered ? "center" : undefined,
			}}
		>
			{children}
		</Container>
	</Box>
);

const whyKeys = [
	"reasonFriction",
	"reasonAllInOne",
	"reasonShortLoop",
	...featureKeys,
] as const;
const whyIcons: ComponentType<SvgIconProps>[] = [
	BoltIcon,
	HubIcon,
	RuleIcon,
	PlayArrowIcon,
	MenuBookIcon,
	CloudQueueIcon,
];

const audiences = [
	{ key: "audienceStudents", Icon: SchoolIcon },
	{ key: "audienceTeachers", Icon: CastForEducationIcon },
	{ key: "audienceProfessionals", Icon: WorkIcon },
] as const;

const trustKeys = [
	"durabilityNoLockIn",
	"durabilityIndependence",
	"privacy",
] as const;
const trustIcons: ComponentType<SvgIconProps>[] = [
	LockOpenIcon,
	CloudQueueIcon,
	PrivacyTipIcon,
];

const IconCardGrid = ({
	keys,
	icons,
}: {
	keys: readonly string[];
	icons: ComponentType<SvgIconProps>[];
}) => {
	const t = useT("public.landing");
	return (
		<FlexBox gap={3} wrap justifyContent="center">
			{keys.map((key, i) => {
				const Icon = icons[i];
				return (
					<Paper
						key={key}
						variant="outlined"
						sx={{ p: 3, flex: "1 1 300px", maxWidth: 360 }}
					>
						<FlexBox
							center
							sx={{
								width: 48,
								height: 48,
								borderRadius: 3,
								color: "primary.main",
								background: (th: Theme) => alpha(th.palette.primary.main, 0.1),
							}}
						>
							<Icon />
						</FlexBox>
						<CardTitle mt={1.5}>{t(`${key}Title` as never)}</CardTitle>
						<Typography variant="body2" color="text.secondary" mt={0.5}>
							{t(`${key}Text` as never)}
						</Typography>
					</Paper>
				);
			})}
		</FlexBox>
	);
};

const showcaseMedia: Record<
	(typeof showcaseKeys)[number],
	{ src: string; portrait?: boolean }
> = {
	showcaseGrafcet: { src: grafcetCapture },
	showcaseLadder: { src: ladderCapture },
	showcaseHmi: { src: hmiCapture },
	showcaseScene3d: { src: scene3dCapture },
	showcaseArduino: { src: arduinoPhoto, portrait: true },
};

const Showcase = ({
	keys,
}: {
	keys: readonly (typeof showcaseKeys)[number][];
}) => {
	const t = useT("public.landing");
	return (
		<Box
			sx={{ display: "flex", flexDirection: "column", gap: { xs: 5, md: 6 } }}
		>
			{keys.map((key, i) => (
				<Box
					key={key}
					sx={{
						display: "flex",
						flexDirection: { xs: "column", md: i % 2 ? "row-reverse" : "row" },
						alignItems: "center",
						justifyContent: "center",
						gap: { xs: 3, md: 6 },
					}}
				>
					<Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
						<CardTitle>{t(`${key}Title`)}</CardTitle>
						<Typography color="text.secondary" mt={1}>
							{t(`${key}Text`)}
						</Typography>
					</Box>
					<Box
						sx={{
							flex: { md: "0 1 640px" },
							minWidth: 0,
							width: { xs: "100%", md: "auto" },
							display: "flex",
							justifyContent: "center",
						}}
					>
						<Box
							component="img"
							src={showcaseMedia[key].src}
							loading="lazy"
							decoding="async"
							alt={t(`${key}Alt`)}
							sx={
								showcaseMedia[key].portrait
									? {
											display: "block",
											maxHeight: 300,
											maxWidth: "100%",
											borderRadius: 2,
										}
									: {
											display: "block",
											width: "100%",
											borderRadius: 2,
											border: "1px solid",
											borderColor: "divider",
											boxShadow: 3,
											background: "#fff",
										}
							}
						/>
					</Box>
				</Box>
			))}
		</Box>
	);
};

const stepKeys = ["step1", "step2", "step3"] as const;

const templateCaptures: Partial<Record<TemplateId, string>> = {
	parking: hmiCapture,
	crossroads: "/images/captures-projets/carrefour-feu-tricolore_hmi.png",
};

const featuredTemplates = PROJECT_TEMPLATES.filter(
	(t) => t.id in templateCaptures,
);

/** Fades the scene out on the text side and at the bottom edge, onto the hero's own background. */
const HERO_SCENE_MASK = [
	"linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 35%, #000 58%)",
	"linear-gradient(180deg, #000 75%, transparent 100%)",
].join(", ");

const LandingPage = () => {
	const t = useT("public.landing");
	const tTemplates = useT("templates");
	const locale = useLocale();
	const tMeta = useT("public.metadata");

	return (
		<Box>
			{/* Hero */}
			<Box
				sx={{
					background: (th: Theme) =>
						`linear-gradient(135deg, ${th.palette.primary.dark} 0%, ${th.palette.primary.main} 100%)`,
					color: "primary.contrastText",
					position: "relative",
					overflow: "hidden",
					py: { xs: 6, md: 10 },
				}}
			>
				<Box sx={{ display: { xs: "none", md: "block" } }}>
					<Illustration3dSlot
						illustration="carton-sorting"
						label={t("heroSceneLabel")}
						mask={HERO_SCENE_MASK}
					/>
				</Box>
				<Container
					maxWidth="lg"
					sx={{
						position: "relative",
						minHeight: { md: 460 },
						display: "flex",
						alignItems: "center",
					}}
				>
					<Box sx={{ maxWidth: { md: 560 } }}>
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								gap: 2,
								alignItems: { xs: "center", md: "flex-start" },
								textAlign: { xs: "center", md: "left" },
							}}
						>
							<Typography
								variant="overline"
								component="p"
								fontWeight={700}
								sx={{ opacity: 0.85 }}
							>
								{APP_NAME}
							</Typography>
							<Typography
								variant="h1"
								component="h1"
								fontWeight={700}
								sx={{
									fontSize: {
										xs: "2rem",
										sm: "2.5rem",
										md: "2.6rem",
										lg: "3rem",
									},
									textWrap: "balance",
								}}
							>
								{t.rich("heroTitle", { br: () => <br /> })}
							</Typography>
							<Typography
								variant="body1"
								component="p"
								sx={{
									opacity: 0.9,
									maxWidth: 720,
									fontSize: { xs: "1.1rem", md: "1.25rem" },
								}}
							>
								{t("heroTagline")}
							</Typography>
							<Typography variant="body2" sx={{ opacity: 0.8 }}>
								{t("heroBadges")}
							</Typography>
							<Box
								sx={{
									display: "flex",
									flexWrap: "wrap",
									gap: 2,
									mt: 1,
									justifyContent: { xs: "center", md: "flex-start" },
								}}
							>
								<OpenAppButton label={t("openApp")} onPrimary />
								<Button
									LinkComponent={Link}
									href="/training"
									size="large"
									variant="outlined"
									startIcon={<SchoolIcon />}
									sx={{
										color: "common.white",
										borderColor: "common.white",
										"&:hover": {
											borderColor: "common.white",
											bgcolor: (th: Theme) =>
												alpha(th.palette.common.white, 0.12),
										},
									}}
								>
									{t("followTraining")}
								</Button>
							</Box>
						</Box>
					</Box>
				</Container>
			</Box>

			{/* Démo vidéo */}
			<Section>
				<SectionTitle>{t("demoTitle")}</SectionTitle>
				<FlexBox justifyContent="center">
					<DemoVideo
						src="/videos/demo-feu-tricolore.mp4"
						label={t("demoVideoLabel")}
					/>
				</FlexBox>
			</Section>

			{/* Vitrine : la logique, puis la machine */}
			<Section tone="muted">
				<SectionTitle>{t("logicTitle")}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={4}>
					{t("logicIntro")}
				</Typography>
				<Showcase keys={logicShowcaseKeys} />
			</Section>

			<Section>
				<SectionTitle>{t("machineTitle")}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={4}>
					{t("machineIntro")}
				</Typography>
				<Showcase keys={machineShowcaseKeys} />
			</Section>

			{/* Pourquoi Studomate ? */}
			<Section tone="muted">
				<SectionTitle>{t("whyTitle")}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={3}>
					{t("whyIntro")}
				</Typography>
				<FlexBox gap={1.5} wrap justifyContent="center" mb={5}>
					{audiences.map(({ key, Icon }) => (
						<Chip
							key={key}
							icon={<Icon />}
							label={t(key)}
							variant="outlined"
							color="primary"
							sx={{
								height: "auto",
								py: 0.75,
								"& .MuiChip-label": { whiteSpace: "normal" },
							}}
						/>
					))}
				</FlexBox>
				<IconCardGrid keys={whyKeys} icons={whyIcons} />
			</Section>

			{/* Templates / exemples */}
			<Section>
				<SectionTitle>{t("templatesTitle")}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={4}>
					{t("templatesIntro")}
				</Typography>
				<FlexBox gap={4} wrap justifyContent="center">
					{featuredTemplates.map((tpl) => (
						<Paper
							key={tpl.id}
							variant="outlined"
							sx={{
								flex: "1 1 340px",
								maxWidth: 460,
								overflow: "hidden",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<Box
								component="img"
								src={templateCaptures[tpl.id]}
								loading="lazy"
								decoding="async"
								alt={t("templatePreviewAlt", {
									label: tTemplates(`${tpl.id}.label` as never),
								})}
								sx={{
									width: "100%",
									aspectRatio: "16 / 10",
									objectFit: "cover",
									objectPosition: "top",
									borderBottom: "1px solid",
									borderColor: "divider",
									background: "#fff",
								}}
							/>
							<Box sx={{ p: 2.5, flex: 1 }}>
								<CardTitle>{tTemplates(`${tpl.id}.label` as never)}</CardTitle>
								<Typography variant="body2" color="text.secondary" mt={0.5}>
									{tTemplates(`${tpl.id}.description` as never)}
								</Typography>
							</Box>
							<Box sx={{ px: 2.5, pb: 2.5 }}>
								<Button
									LinkComponent={NextLink}
									href={`${routes.app()}?template=${tpl.id}&template-mode=solution&template-locale=${locale}`}
									variant="outlined"
									size="small"
								>
									{t("openInApp")}
								</Button>
							</Box>
						</Paper>
					))}
				</FlexBox>
			</Section>

			{/* Formations */}
			<Section tone="muted">
				<SectionTitle>{t("trainingTitle")}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={4}>
					{t("trainingIntro")}
				</Typography>
				<Box
					component="ul"
					sx={{
						listStyle: "none",
						p: 0,
						m: 0,
						display: "grid",
						gap: 2,
						gridTemplateColumns: {
							xs: "1fr",
							sm: "repeat(2, 1fr)",
							md: "repeat(5, 1fr)",
						},
					}}
				>
					{TRAINING_MODULE_IDS.map((moduleId) => {
						const id = moduleId.toUpperCase() as "A1";
						return (
							<Paper
								key={moduleId}
								component="li"
								variant="outlined"
								sx={{
									position: "relative",
									p: 2.5,
									display: "flex",
									flexDirection: "column",
									gap: 1,
									transition: "border-color 0.15s",
									"&:hover": { borderColor: "primary.main" },
								}}
							>
								<Chip
									label={t(`training${id}Topic`)}
									size="small"
									color="primary"
									variant="outlined"
									sx={{ alignSelf: "flex-start" }}
								/>
								<CardTitle>
									<MuiLink
										component={Link}
										href={`/training/${moduleId}`}
										underline="hover"
										color="inherit"
										sx={{
											"&::after": {
												content: '""',
												position: "absolute",
												inset: 0,
											},
										}}
									>
										{tMeta(`training${id}Title`)}
									</MuiLink>
								</CardTitle>
								<Typography variant="body2" color="text.secondary">
									{t(`training${id}Summary`)}
								</Typography>
							</Paper>
						);
					})}
				</Box>
				<FlexBox justifyContent="center" mt={4}>
					<Button component={Link} href="/training" variant="outlined">
						{t("trainingCta")}
					</Button>
				</FlexBox>
			</Section>

			{/* Confiance */}
			<Section>
				<SectionTitle>{t("durabilityTitle")}</SectionTitle>
				<IconCardGrid keys={trustKeys} icons={trustIcons} />
				<FlexBox column center gap={2} mt={4}>
					<Typography color="text.secondary" textAlign="center">
						{t("sourceCodeText")}
					</Typography>
					<Button
						component="a"
						href={APP_REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						variant="outlined"
						size="large"
						startIcon={<GitHubIcon />}
					>
						{t("viewOnGitHub")}
					</Button>
				</FlexBox>
			</Section>

			{/* Démarrer en 30 secondes */}
			<Section tone="primary">
				<SectionTitle>{t("stepsTitle")}</SectionTitle>
				<FlexBox gap={3} wrap justifyContent="center">
					{stepKeys.map((key, i) => (
						<Box
							key={key}
							sx={{ flex: "1 1 260px", maxWidth: 320, textAlign: "center" }}
						>
							<FlexBox
								center
								sx={{
									width: 44,
									height: 44,
									borderRadius: "50%",
									mx: "auto",
									mb: 1.5,
									fontWeight: 700,
									color: "primary.main",
									background: (th: Theme) => th.palette.common.white,
								}}
							>
								{i + 1}
							</FlexBox>
							<CardTitle>{t(`${key}Title` as never)}</CardTitle>
							<Typography variant="body2" mt={0.5}>
								{t(`${key}Text` as never)}
							</Typography>
						</Box>
					))}
				</FlexBox>
				<FlexBox justifyContent="center" mt={5}>
					<OpenAppButton label={t("openApp")} onPrimary />
				</FlexBox>
			</Section>
		</Box>
	);
};

export default LandingPage;
