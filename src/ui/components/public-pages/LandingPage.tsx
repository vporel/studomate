"use client";

import {
	APP_NAME,
	APP_REPO_URL,
	APP_SHORT_DESCRIPTION,
	APP_SLOGAN,
} from "@/app-info";
import routes from "@/app/routes";
import { PROJECT_TEMPLATES } from "@/templates/index";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
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
import Link from "next/link";
import { ComponentType } from "react";
import HeroCarousel from "./HeroCarousel";

const OpenAppButton = ({
	size = "large",
	variant = "contained",
}: {
	size?: "medium" | "large";
	variant?: "contained" | "outlined";
}) => (
	<Button
		LinkComponent={Link}
		href={routes.app()}
		size={size}
		variant={variant}
		startIcon={<PlayArrowIcon />}
	>
		Ouvrir l&apos;application
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

const features: {
	icon: ComponentType<SvgIconProps>;
	title: string;
	text: string;
}[] = [
	{
		icon: AccountTreeIcon,
		title: "Édition multi-langages",
		text: "GRAFCET et Ladder : étapes, transitions, contacts, bobines, temporisations, compteurs.",
	},
	{
		icon: ViewQuiltIcon,
		title: "Interfaces HMI",
		text: "Concevez des interfaces homme-machine interactives pour piloter et visualiser le système.",
	},
	{
		icon: PlayArrowIcon,
		title: "Simulation temps réel",
		text: "Exécution pas-à-pas ou continue, avec visualisation des états, transitions et variables en direct.",
	},
	{
		icon: FactCheckIcon,
		title: "Analyse du projet",
		text: "Détection des erreurs de structure avant de lancer la simulation.",
	},
	{
		icon: MenuBookIcon,
		title: "Manuel intégré",
		text: "Une aide complète accessible directement depuis l'application.",
	},
	{
		icon: CloudQueueIcon,
		title: "Comptes & cloud (optionnel)",
		text: "Projets stockés localement ou dans le cloud, avec partage par lien.",
	},
];

const steps = [
	{
		n: 1,
		title: "Ouvrez l'application",
		text: "Rien à installer, tout se passe dans le navigateur.",
	},
	{
		n: 2,
		title: "Créez un projet ou partez d'un exemple",
		text: "Démarrez de zéro ou ouvrez l'un des templates prêts à l'emploi.",
	},
	{
		n: 3,
		title: "Analysez, puis simulez",
		text: "Vérifiez la structure, puis exécutez la logique et observez le système réagir.",
	},
];

const grafcetCapture =
	"/images/captures-projets/parking-a-barriere_grafcet.png";
const hmiCapture = "/images/captures-projets/parking-a-barriere_hmi.jpeg";

const heroSlides = [
	{
		src: grafcetCapture,
		alt: `L'éditeur ${APP_NAME} en cours de simulation d'un GRAFCET`,
	},
	{
		src: hmiCapture,
		alt: `L'éditeur d'interface HMI de ${APP_NAME}`,
	},
];

const templateCaptures: Record<string, string> = {
	parking: grafcetCapture,
	crossroads: "/images/captures-projets/carrefour-feu-tricolore_hmi.png",
};

const featuredTemplates = PROJECT_TEMPLATES.filter(
	(t) => t.id in templateCaptures,
);

const LandingPage = () => {
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
							{APP_SLOGAN}
						</Typography>
						<Typography
							variant="h6"
							component="p"
							color="text.secondary"
							sx={{ maxWidth: 620 }}
						>
							{APP_SHORT_DESCRIPTION}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Gratuit et open source · Sans installation · Vos projets restent
							sur votre machine
						</Typography>
						<FlexBox gap={2} wrap justifyContent="center" mt={1}>
							<OpenAppButton />
							<Button
								LinkComponent={Link}
								href={routes.userManual()}
								size="large"
								variant="outlined"
								startIcon={<MenuBookIcon />}
							>
								Consulter le manuel
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

			{/* Public visé */}
			<Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>Pour qui ?</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={3}>
					Studomate s&apos;adresse à toutes celles et ceux qui apprennent ou
					enseignent l&apos;automatisme.
				</Typography>
				<FlexBox gap={2} wrap justifyContent="center">
					{[
						"Étudiants (BTS, IUT, écoles d'ingénieurs, universités)",
						"Enseignants et formateurs en automatisme / électrotechnique",
						"Professionnels en reconversion ou remise à niveau",
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
				<SectionTitle>Ce que propose {APP_NAME}</SectionTitle>
				<FlexBox gap={3} wrap justifyContent="center">
					{features.map(({ icon: Icon, title, text }) => (
						<Paper
							key={title}
							variant="outlined"
							sx={{ p: 3, flex: "1 1 300px", maxWidth: 360 }}
						>
							<Icon color="primary" fontSize="large" />
							<Typography variant="h6" fontWeight={700} mt={1}>
								{title}
							</Typography>
							<Typography variant="body2" color="text.secondary" mt={0.5}>
								{text}
							</Typography>
						</Paper>
					))}
				</FlexBox>
			</Container>

			<Divider />

			{/* Démarrer en 30 secondes */}
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>Démarrez en 30 secondes</SectionTitle>
				<FlexBox gap={3} wrap justifyContent="center">
					{steps.map(({ n, title, text }) => (
						<Box
							key={n}
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
								{n}
							</FlexBox>
							<Typography variant="h6" fontWeight={700}>
								{title}
							</Typography>
							<Typography variant="body2" color="text.secondary" mt={0.5}>
								{text}
							</Typography>
						</Box>
					))}
				</FlexBox>
				<FlexBox justifyContent="center" mt={5}>
					<OpenAppButton />
				</FlexBox>
			</Container>

			<Divider />

			{/* Templates / exemples */}
			<Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
				<SectionTitle>Des exemples pour démarrer</SectionTitle>
				<Typography textAlign="center" color="text.secondary" mb={4}>
					Ouvrez un projet pré-configuré et explorez-le à votre rythme.
				</Typography>
				<FlexBox gap={4} wrap justifyContent="center">
					{featuredTemplates.map((t) => (
						<Paper
							key={t.id}
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
								src={templateCaptures[t.id]}
								alt={`Aperçu du projet ${t.label}`}
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
									{t.label}
								</Typography>
								<Typography variant="body2" color="text.secondary" mt={0.5}>
									{t.description}
								</Typography>
							</Box>
							<Box sx={{ px: 2.5, pb: 2.5 }}>
								<Button
									LinkComponent={Link}
									href={routes.app()}
									variant="outlined"
									size="small"
								>
									Ouvrir dans l&apos;application
								</Button>
							</Box>
						</Paper>
					))}
				</FlexBox>
			</Container>

			<Divider />

			{/* Open source */}
			<Container
				maxWidth="md"
				sx={{ py: { xs: 6, md: 8 }, textAlign: "center" }}
			>
				<SectionTitle>Open source</SectionTitle>
				<Typography color="text.secondary" sx={{ maxWidth: 560, mx: "auto" }}>
					{APP_NAME} est un projet libre sous licence MIT. Les idées, retours et
					contributions sont les bienvenus.
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
						Voir sur GitHub
					</Button>
				</FlexBox>
			</Container>
		</Box>
	);
};

export default LandingPage;
