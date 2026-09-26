import { toLocale } from "@/i18n/config";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { createGenerateMetadata } from "@/app/metadata";
import type { PublicPathname } from "@/i18n/routing";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import PublicLinkButton from "@/ui/components/public-pages/PublicLinkButton";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import {
	Box,
	Container,
	Divider,
	Paper,
	Stack,
	Typography,
} from "@mui/material";
import { getTranslations, setRequestLocale } from "next-intl/server";
import A0_STEP_IDS from "./a0/step-ids";
import A1_STEP_IDS from "./a1/step-ids";
import A2_STEP_IDS from "./a2/step-ids";
import A3_STEP_IDS from "./a3/step-ids";
import A4_STEP_IDS from "./a4/step-ids";
import ResumeSignInHint from "./ResumeSignInHint";
import TrainingModuleRow from "./TrainingModuleRow";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/training",
	"trainingTitle",
	"trainingDescription",
);

type ModuleEntry = {
	label: string;
	available: boolean;
	href?: PublicPathname;
	moduleId?: string;
	stepIds?: string[];
};

export default async function Training({ params }: Props) {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });

	const howItWorks = [
		{
			Icon: MenuBookIcon,
			title: t("howItWorksTheoryTitle"),
			body: t("howItWorksTheoryBody"),
		},
		{
			Icon: PlayCircleIcon,
			title: t("howItWorksExerciseTitle"),
			body: t("howItWorksExerciseBody"),
		},
		{
			Icon: FactCheckIcon,
			title: t("howItWorksSolutionTitle"),
			body: t("howItWorksSolutionBody"),
		},
	];

	const modulesA: ModuleEntry[] = [
		{
			label: t("blockA0Label"),
			available: true,
			href: "/training/a0",
			moduleId: "a0",
			stepIds: Object.values(A0_STEP_IDS),
		},
		{
			label: t("blockA1Label"),
			available: true,
			href: "/training/a1",
			moduleId: "a1",
			stepIds: Object.values(A1_STEP_IDS),
		},
		{
			label: t("blockA2Label"),
			available: true,
			href: "/training/a2",
			moduleId: "a2",
			stepIds: Object.values(A2_STEP_IDS),
		},
		{
			label: t("blockA3Label"),
			available: true,
			href: "/training/a3",
			moduleId: "a3",
			stepIds: Object.values(A3_STEP_IDS),
		},
		{
			label: t("blockA4Label"),
			available: true,
			href: "/training/a4",
			moduleId: "a4",
			stepIds: Object.values(A4_STEP_IDS),
		},
		{ label: t("blockA5Label"), available: false },
	];
	const modulesB: ModuleEntry[] = [
		{ label: t("blockB1Label"), available: false },
		{ label: t("blockB2Label"), available: false },
	];

	const BlockCard = ({
		title,
		modules,
	}: {
		title: string;
		modules: ModuleEntry[];
	}) => (
		<Paper
			variant="outlined"
			sx={{ p: { xs: 2, sm: 3 }, flex: 1, borderRadius: 3 }}
		>
			<Typography variant="h6" fontWeight={700} gutterBottom>
				{title}
			</Typography>
			<Stack divider={<Divider />}>
				{modules.map((module) => (
					<TrainingModuleRow
						key={module.label}
						label={module.label}
						available={module.available}
						href={module.href}
						statusLabel={t("moduleAvailableStatusLabel")}
						completedLabel={t("moduleCompletedLabel")}
						comingSoonLabel={t("comingSoon")}
						moduleId={module.moduleId}
						stepIds={module.stepIds}
					/>
				))}
			</Stack>
		</Paper>
	);

	return (
		<Container maxWidth="lg" sx={{ my: { xs: 4, md: 6 } }}>
			<Box maxWidth={720}>
				<PageTitle>
					{t("landingTitle")}
				</PageTitle>
				<Typography textAlign="justify" color="text.secondary">
					{t("landingIntro")}
				</Typography>
			</Box>

			<Typography variant="h5" fontWeight={700} mt={5} mb={2}>
				{t("howItWorksTitle")}
			</Typography>
			<Stack direction={{ xs: "column", sm: "row" }} gap={2}>
				{howItWorks.map(({ Icon, title, body }) => (
					<Paper
						key={title}
						variant="outlined"
						sx={{ p: 2.5, flex: 1, borderRadius: 3 }}
					>
						<Icon color="primary" />
						<Typography fontWeight={700} mt={1}>
							{title}
						</Typography>
						<Typography variant="body2" color="text.secondary" mt={0.5}>
							{body}
						</Typography>
					</Paper>
				))}
			</Stack>

			<Stack
				direction={{ xs: "column", md: "row" }}
				gap={3}
				mt={5}
				alignItems="stretch"
			>
				<BlockCard title={t("blockATitle")} modules={modulesA} />
				<BlockCard title={t("blockBLabel")} modules={modulesB} />
			</Stack>

			<Stack
				direction={{ xs: "column", sm: "row" }}
				gap={2}
				alignItems={{ xs: "flex-start", sm: "center" }}
				mt={4}
			>
				<PublicLinkButton
					href="/training/a0"
					variant="contained"
					size="large"
					startIcon={<PlayArrowIcon />}
				>
					{t("a0Link")}
				</PublicLinkButton>
				<PublicLink href="/">{t("backHome")}</PublicLink>
			</Stack>

			<Box mt={2}>
				<ResumeSignInHint
					hint={t("resumeSignInHint")}
					cta={t("resumeSignInCta")}
					savedHint={t("progressSavedHint")}
				/>
			</Box>
		</Container>
	);
}
