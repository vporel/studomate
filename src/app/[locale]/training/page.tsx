import { toLocale } from "@/i18n/config";
import { pageMetadata } from "@/i18n/metadata";
import type { PublicPathname } from "@/i18n/routing";
import PublicLink from "@/ui/components/public-pages/PublicLink";
import PublicLinkButton from "@/ui/components/public-pages/PublicLinkButton";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { alpha, Box, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import { green } from "@mui/material/colors";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import M1_STEP_IDS from "./m1/step-ids";
import ResumeSignInHint from "./ResumeSignInHint";
import TrainingModuleRow from "./TrainingModuleRow";

const AVAILABLE_ROW_BACKGROUND = alpha(green[700], 0.08);

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale: rawLocale } = await params;
	const locale = toLocale(rawLocale);
	const t = await getTranslations({ locale, namespace: "public.metadata" });
	return pageMetadata(
		locale,
		"/training",
		t("trainingTitle"),
		t("trainingDescription"),
	);
}

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
			label: t("blockM1Label"),
			available: true,
			href: "/training/m1",
			moduleId: "m1",
			stepIds: Object.values(M1_STEP_IDS),
		},
		{ label: t("blockM2Label"), available: false },
		{ label: t("blockM3Label"), available: false },
	];
	const modulesB: ModuleEntry[] = [
		{ label: t("blockM4Label"), available: false },
		{ label: t("blockM5Label"), available: false },
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
						statusLabel={t("blockM1Status")}
						completedLabel={t("moduleCompletedLabel")}
						comingSoonLabel={t("comingSoon")}
						backgroundColor={AVAILABLE_ROW_BACKGROUND}
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
				<Typography variant="h2" component="h1" color="primary" gutterBottom>
					{t("landingTitle")}
				</Typography>
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
					href="/training/m1"
					variant="contained"
					size="large"
					startIcon={<PlayArrowIcon />}
				>
					{t("m1Link")}
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
