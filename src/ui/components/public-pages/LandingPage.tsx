"use client";

import { APP_NAME, APP_REPO_URL } from "@/app-info";
import routes from "@/app/routes";
import { Link } from "@/i18n/navigation";
import { PROJECT_TEMPLATES, type TemplateId } from "@/templates/index";
import { useT } from "@/ui/i18n/useT";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BoltIcon from "@mui/icons-material/Bolt";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import HubIcon from "@mui/icons-material/Hub";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RuleIcon from "@mui/icons-material/Rule";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import {
	Box,
	Button,
	Container,
	Divider,
	Paper,
	SvgIconProps,
	Theme,
	Typography,
	alpha,
} from "@mui/material";
import NextLink from "next/link";
import { ComponentType } from "react";
import HeroCarousel from "./HeroCarousel";

const OpenAppButton = ({
	label,
	size = "large",
	variant = "contained",
}: {
	label: string;
	size?: "medium" | "large";
	variant?: "contained" | "outlined";
}) => (
	<Button
		LinkComponent={NextLink}
		href={routes.app()}
		size={size}
		variant={variant}
		startIcon={<PlayArrowIcon />}
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
	>
		{children}
	</Typography>
);

const featureIcons: ComponentType<SvgIconProps>[] = [
	AccountTreeIcon,
	ViewQuiltIcon,
	PlayArrowIcon,
	FactCheckIcon,
	MenuBookIcon,
	CloudQueueIcon,
];
const featureKeys = [
	"featureEditing",
	"featureHmi",
	"featureSimulation",
	"featureAnalysis",
	"featureManual",
	"featureCloud",
] as const;

const reasonIcons: ComponentType<SvgIconProps>[] = [BoltIcon, HubIcon, RuleIcon];
const reasonKeys = [
	"reasonFriction",
	"reasonAllInOne",
	"reasonShortLoop",
] as const;

const stepKeys = ["step1", "step2", "step3"] as const;

const grafcetCapture = "/images/captures-projets/parking-a-barriere_grafcet.png";
const hmiCapture = "/images/captures-projets/parking-a-barriere_hmi.jpeg";
const ladderCapture = "/images/captures-projets/project-test_ladder.png";

const templateCaptures: Partial<Record<TemplateId, string>> = {
	parking: grafcetCapture,
	crossroads: "/images/captures-projets/carrefour-feu-tricolore_hmi.png",
};

const featuredTemplates = PROJECT_TEMPLATES.filter((t) => t.id in templateCaptures);

const LandingPage = () => {
	const t = useT("public.landing");
	const tTemplates = useT("templates");

	const heroSlides = [
		{ src: grafcetCapture, alt: t("heroSlideGrafcet", { name: APP_NAME }) },
		{ src: ladderCapture, alt: t("heroSlideLadder", { name: APP_NAME }) },
		{ src: hmiCapture, alt: t("heroSlideHmi", { name: APP_NAME }) },
	];

	return (
		<Box>
			{/* Hero */}
			<Box
				sx={{
					background: (th: Theme) =>
						`linear-gradient(180deg, ${alpha(
							th.palette.primary.main,
							0.06,
						)} 0%, ${th.palette.background.default} 100%)`,
					py: { xs: 6, md: 10 },
				}}
			>
				<Container maxWidth="lg">
					<FlexBox column alignItems="center" textAlign="center" gap={2}>
						<Typography variant="h1" component="h1" fontWeight={800}>
							{APP_NAME}
						</Typography>
						<Typography
							variant="h4"
							component="p"
							color="primary"
							fontWeight={600}
						>
							{t("slogan")}
						</Typography>
						<Typography
							variant="h6"
							component="p"
							color="text.secondary"
							sx={{ maxWidth: 720 }}
						>
							{t("heroTagline")}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{t("heroBadges")}
						</Typography>
						<FlexBox gap={2} wrap justifyContent="center" mt={1}>
							<OpenAppButton label={t("openApp")} />
							<Button
								LinkComponent={Link}
								href="/user-manual"
								size="large"
								variant="outlined"
								startIcon={<MenuBookIcon />}
							>
								{t("openManual")}
							</Button>
						</FlexBox>
						<Box
							sx={{
								mt: 4,
								width: "100%",
								display: "flex",
								justifyContent: "center",
							}}
						>
							<HeroCarousel slides={heroSlides} />
						</Box>
					</FlexBox>
				</Container>
			</Box>

			{/* Pourquoi Studomate ? */}
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>{t("whyTitle", { name: APP_NAME })}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={4}>
					{t("whyIntro", { name: APP_NAME })}
				</Typography>
				<FlexBox gap={3} wrap justifyContent="center">
					{reasonKeys.map((key, i) => {
						const Icon = reasonIcons[i];
						return (
							<Paper
								key={key}
								variant="outlined"
								sx={{ p: 3, flex: "1 1 300px", maxWidth: 360 }}
							>
								<Icon color="primary" fontSize="large" />
								<Typography variant="h6" fontWeight={700} mt={1}>
									{t(`${key}Title` as never)}
								</Typography>
								<Typography variant="body2" color="text.secondary" mt={0.5}>
									{t(`${key}Text` as never)}
								</Typography>
							</Paper>
						);
					})}
				</FlexBox>
			</Container>

			<Divider />

			{/* Public visé */}
			<Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>{t("audienceTitle")}</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={3}>
					{t("audienceIntro")}
				</Typography>
				<FlexBox gap={2} wrap justifyContent="center">
					{[
						t("audienceStudents"),
						t("audienceTeachers"),
						t("audienceProfessionals"),
					].map((profile) => (
						<Paper
							key={profile}
							variant="outlined"
							sx={{
								p: 2,
								flex: "1 1 220px",
								maxWidth: 280,
								textAlign: "center",
							}}
						>
							<Typography variant="body2">{profile}</Typography>
						</Paper>
					))}
				</FlexBox>
			</Container>

			<Divider />

			{/* Fonctionnalités */}
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>{t("featuresTitle", { name: APP_NAME })}</SectionTitle>
				<FlexBox gap={3} wrap justifyContent="center">
					{featureKeys.map((key, i) => {
						const Icon = featureIcons[i];
						return (
							<Paper
								key={key}
								variant="outlined"
								sx={{ p: 3, flex: "1 1 300px", maxWidth: 360 }}
							>
								<Icon color="primary" fontSize="large" />
								<Typography variant="h6" fontWeight={700} mt={1}>
									{t(`${key}Title` as never)}
								</Typography>
								<Typography variant="body2" color="text.secondary" mt={0.5}>
									{t(`${key}Text` as never)}
								</Typography>
							</Paper>
						);
					})}
				</FlexBox>
			</Container>

			<Divider />

			{/* Démarrer en 30 secondes */}
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
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
									color: "primary.contrastText",
									background: (th: Theme) => th.palette.primary.main,
								}}
							>
								{i + 1}
							</FlexBox>
							<Typography variant="h6" fontWeight={700}>
								{t(`${key}Title` as never)}
							</Typography>
							<Typography variant="body2" color="text.secondary" mt={0.5}>
								{t(`${key}Text` as never)}
							</Typography>
						</Box>
					))}
				</FlexBox>
				<FlexBox justifyContent="center" mt={5}>
					<OpenAppButton label={t("openApp")} />
				</FlexBox>
			</Container>

			<Divider />

			{/* Templates / exemples */}
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
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
								alt={t("templatePreviewAlt", {
									label: tTemplates(`${tpl.id}.label` as never),
								})}
								sx={{
									width: "100%",
									aspectRatio: "16 / 9",
									objectFit: "cover",
									borderBottom: "1px solid",
									borderColor: "divider",
									background: "#fff",
								}}
							/>
							<Box sx={{ p: 2.5, flex: 1 }}>
								<Typography variant="h6" fontWeight={700}>
									{tTemplates(`${tpl.id}.label` as never)}
								</Typography>
								<Typography variant="body2" color="text.secondary" mt={0.5}>
									{tTemplates(`${tpl.id}.description` as never)}
								</Typography>
							</Box>
							<Box sx={{ px: 2.5, pb: 2.5 }}>
								<Button
									LinkComponent={NextLink}
									href={routes.app()}
									variant="outlined"
									size="small"
								>
									{t("openInApp")}
								</Button>
							</Box>
						</Paper>
					))}
				</FlexBox>
			</Container>

			<Divider />

			{/* Pérennité */}
			<Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>{t("durabilityTitle")}</SectionTitle>
				<FlexBox gap={3} wrap justifyContent="center">
					{(["durabilityNoLockIn", "durabilityIndependence"] as const).map(
						(key, i) => {
							const Icon = i === 0 ? LockOpenIcon : CloudQueueIcon;
							return (
								<Paper
									key={key}
									variant="outlined"
									sx={{ p: 3, flex: "1 1 300px", maxWidth: 380 }}
								>
									<Icon color="primary" fontSize="large" />
									<Typography variant="h6" fontWeight={700} mt={1}>
										{t(`${key}Title` as never)}
									</Typography>
									<Typography variant="body2" color="text.secondary" mt={0.5}>
										{t(`${key}Text` as never)}
									</Typography>
								</Paper>
							);
						},
					)}
				</FlexBox>
			</Container>

			<Divider />

			{/* Vie privée */}
			<Container
				maxWidth="md"
				sx={{ py: { xs: 6, md: 8 }, textAlign: "center" }}
			>
				<SectionTitle>{t("privacyTitle")}</SectionTitle>
				<Typography color="text.secondary" sx={{ maxWidth: 560, mx: "auto" }}>
					{t("privacyText")}
				</Typography>
			</Container>

			<Divider />

			{/* Open source */}
			<Container
				maxWidth="md"
				sx={{ py: { xs: 6, md: 8 }, textAlign: "center" }}
			>
				<SectionTitle>{t("openSourceTitle")}</SectionTitle>
				<Typography color="text.secondary" sx={{ maxWidth: 560, mx: "auto" }}>
					{t("openSourceText", { name: APP_NAME })}
				</Typography>
				<FlexBox justifyContent="center" mt={3}>
					<Button
						component="a"
						href={APP_REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						variant="outlined"
						size="large"
					>
						{t("viewOnGitHub")}
					</Button>
				</FlexBox>
			</Container>
		</Box>
	);
};

export default LandingPage;
