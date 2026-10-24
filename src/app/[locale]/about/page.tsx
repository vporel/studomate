import { toLocale } from "@/i18n/config";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { createGenerateMetadata } from "@/app/metadata";
import PublicLinkButton from "@/ui/components/public-pages/PublicLinkButton";
import TintedPaper from "@/ui/components/public-pages/TintedPaper";
import IconCard from "@/ui/components/public-pages/IconCard";
import {
	arduinoPhoto,
	grafcetCapture,
	hmiCapture,
	ladderCapture,
	scene3dCapture,
} from "@/ui/components/public-pages/landing-content";
import routes from "@/app/routes";
import { APP_REPO_URL } from "@/app-info";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CastForEducationIcon from "@mui/icons-material/CastForEducation";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import CodeIcon from "@mui/icons-material/Code";
import ExtensionIcon from "@mui/icons-material/Extension";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GitHubIcon from "@mui/icons-material/GitHub";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import LanguageIcon from "@mui/icons-material/Language";
import MemoryIcon from "@mui/icons-material/Memory";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SchoolIcon from "@mui/icons-material/School";
import SearchIcon from "@mui/icons-material/Search";
import SpeedIcon from "@mui/icons-material/Speed";
import ThreeDRotationIcon from "@mui/icons-material/ThreeDRotation";
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import WorkIcon from "@mui/icons-material/Work";
import {
	Box,
	Button,
	Chip,
	Container,
	Divider,
	Paper,
	Typography,
} from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ComponentType, ReactNode } from "react";
import { Fragment } from "react";
import { renderStrong } from "../legal/LegalArticle";

type Props = { params: Promise<{ locale: string }> };

type CardItem = { title: string; text: string };

const OFFERING_ICONS: ComponentType[] = [
	AccountTreeIcon,
	TroubleshootIcon,
	PlayCircleOutlineIcon,
	ViewInArIcon,
	MemoryIcon,
	SearchIcon,
	LanguageIcon,
];
const VALUE_ICONS: ComponentType[] = [
	SchoolIcon,
	ExtensionIcon,
	CastForEducationIcon,
	SpeedIcon,
];
const OWNERSHIP_ICONS: ComponentType[] = [
	FolderOpenIcon,
	CloudQueueIcon,
	CodeIcon,
];
const AUDIENCE_ICONS: ComponentType[] = [
	SchoolIcon,
	CastForEducationIcon,
	WorkIcon,
];

export const generateMetadata = createGenerateMetadata(
	"/about",
	"aboutTitle",
	"aboutDescription",
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
	<Typography variant="h3" component="h2" gutterBottom mt={5}>
		{children}
	</Typography>
);

const CardGrid = ({ children }: { children: ReactNode }) => (
	<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}>
		{children}
	</Box>
);

export default async function About({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "public.about" });

	const items = (key: string) => t.raw(key) as CardItem[];
	const labels = (key: string) => t.raw(key) as string[];

	const tLanding = await getTranslations({
		locale,
		namespace: "public.landing",
	});

	const offeringImages: Record<
		number,
		{ src: string; alt: string; contain?: boolean }
	> = {
		3: {
			src: scene3dCapture,
			alt: tLanding("showcaseScene3dAlt"),
		},
		4: {
			src: arduinoPhoto,
			alt: tLanding("showcaseArduinoAlt"),
			contain: true,
		},
	};

	const editorCaptures = [
		{
			src: grafcetCapture,
			alt: tLanding("showcaseGrafcetAlt"),
		},
		{
			src: ladderCapture,
			alt: tLanding("showcaseLadderAlt"),
		},
		{ src: hmiCapture, alt: tLanding("showcaseHmiAlt") },
	];

	const cards = (
		key: string,
		icons: ComponentType[],
		images: Record<
			number,
			{ src: string; alt: string; contain?: boolean }
		> = {},
	) => (
		<CardGrid>
			{items(key).map((item, i) => (
				<IconCard
					key={item.title}
					icon={icons[i]}
					title={item.title}
					image={images[i]}
				>
					{item.text}
				</IconCard>
			))}
		</CardGrid>
	);

	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<PageTitle>{t("title")}</PageTitle>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h3" component="h2" gutterBottom mt={3}>
				{t("missionTitle")}
			</Typography>
			<Typography fontSize="1.1rem">
				{renderStrong(t.raw("missionBody"))}
			</Typography>
			<Typography color="text.secondary" mt={1}>
				{t("missionBody2")}
			</Typography>
			<TintedPaper sx={{ mt: 2, p: 2, borderColor: "primary.main" }}>
				<Typography fontWeight={700}>{t("differentiatorLabel")}</Typography>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}>
					{editorCaptures.map((capture, i) => (
						<Box
							key={capture.src}
							component="figure"
							sx={{ flex: "1 1 200px", minWidth: 0, m: 0 }}
						>
							<Chip
								color="primary"
								label={labels("differentiatorEditors")[i]}
								sx={{ mb: 1 }}
							/>
							<Box
								component="img"
								src={capture.src}
								alt={capture.alt}
								loading="lazy"
								decoding="async"
								sx={{
									display: "block",
									width: "100%",
									aspectRatio: "16 / 10",
									objectFit: "cover",
									objectPosition: "top",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "divider",
									background: "#fff",
								}}
							/>
						</Box>
					))}
				</Box>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
					{labels("differentiatorItems").map((label, i) => (
						<Chip
							key={label}
							color="primary"
							variant="outlined"
							icon={i === 1 ? <ThreeDRotationIcon /> : undefined}
							label={label}
						/>
					))}
				</Box>
			</TintedPaper>

			<SectionTitle>{t("offeringTitle")}</SectionTitle>
			{cards("offeringItems", OFFERING_ICONS, offeringImages)}

			<SectionTitle>{t("valueTitle")}</SectionTitle>
			{cards("valueItems", VALUE_ICONS)}
			<Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
				<Typography variant="body2" color="text.secondary" mb={1}>
					<FactCheckIcon
						fontSize="inherit"
						sx={{ verticalAlign: "-2px", mr: 0.5 }}
					/>
					{t("causalityLabel")}
				</Typography>
				<Box
					sx={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: 1,
					}}
				>
					{labels("causalityItems").map((label, i) => (
						<Fragment key={label}>
							{i > 0 && (
								<Typography color="text.secondary" aria-hidden>
									→
								</Typography>
							)}
							<Chip label={label} />
						</Fragment>
					))}
				</Box>
			</Paper>

			<SectionTitle>{t("ownershipTitle")}</SectionTitle>
			{cards("ownershipItems", OWNERSHIP_ICONS)}

			<SectionTitle>{t("audienceTitle")}</SectionTitle>
			{cards("audienceItems", AUDIENCE_ICONS)}

			<Paper
				variant="outlined"
				sx={{
					mt: 5,
					p: 3,
					textAlign: "center",
					bgcolor: "primary.main",
					borderColor: "primary.main",
					color: "primary.contrastText",
				}}
			>
				<Typography variant="h3" component="h2" gutterBottom>
					{t("ctaTitle")}
				</Typography>
				<Typography mb={2}>{t("ctaBody")}</Typography>
				<Button
					component="a"
					href={routes.app()}
					variant="contained"
					size="large"
					startIcon={<PlayArrowIcon />}
					sx={{
						bgcolor: "common.white",
						color: "primary.main",
						"&:hover": { bgcolor: "grey.100" },
					}}
				>
					{tLanding("openApp")}
				</Button>
			</Paper>

			<TintedPaper sx={{ mt: 2, p: 3, textAlign: "center" }}>
				<Typography variant="h3" component="h2" gutterBottom>
					{t("contactTitle")}
				</Typography>
				<Typography mb={2}>{t("contactBody")}</Typography>
				<Box
					sx={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "center",
						gap: 2,
					}}
				>
					<PublicLinkButton href="/contact" variant="contained">
						{t("contactLink")}
					</PublicLinkButton>
					<Button
						component="a"
						href={APP_REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						variant="outlined"
						startIcon={<GitHubIcon />}
					>
						{tLanding("viewOnGitHub")}
					</Button>
				</Box>
			</TintedPaper>
		</Container>
	);
}
