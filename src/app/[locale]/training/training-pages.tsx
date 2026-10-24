import { createGenerateMetadata, pageMetadata } from "@/app/metadata";
import { toLocale } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import PublicBreadcrumbs from "@/ui/components/public-pages/PublicBreadcrumbs";
import TrainingModulePage from "./TrainingModulePage";
import {
	buildModuleSteps,
	moduleEntryPathname,
	moduleStepPathname,
	TRAINING_MODULES,
} from "./training-modules";
import type { TrainingModuleId } from "@/training/module-ids";
import {
	trainingStepIdFromSlug,
	trainingStepSlug,
} from "@/training/step-slugs";
import type { TrainingTranslator } from "./training-translator";

type ModuleParams = { params: Promise<{ locale: string }> };
type StepParams = { params: Promise<{ locale: string; step: string }> };

async function renderModule(
	moduleId: TrainingModuleId,
	rawLocale: string,
	stepSlug: string | undefined,
	children: ((t: TrainingTranslator) => ReactNode) | undefined,
) {
	const locale = toLocale(rawLocale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "training" });
	const { buildSteps, next } = TRAINING_MODULES[moduleId];
	const steps = buildSteps(t);
	const stepId =
		stepSlug === undefined
			? undefined
			: trainingStepIdFromSlug(
					locale,
					moduleId,
					stepSlug,
					steps.map((s) => s.id),
				);
	if (stepSlug !== undefined && stepId === null) notFound();

	const hub = { label: t("landingTitle"), href: "/training" } as const;
	const moduleLabel = t(`${moduleId}PageTitle`);
	const breadcrumb = (
		<PublicBreadcrumbs
			locale={locale}
			ancestors={
				stepId === undefined
					? [hub]
					: [hub, { label: moduleLabel, href: moduleEntryPathname(moduleId) }]
			}
			current={
				stepId === undefined
					? { label: moduleLabel, href: moduleEntryPathname(moduleId) }
					: undefined
			}
		/>
	);

	return (
		<TrainingModulePage
			breadcrumb={breadcrumb}
			title={moduleLabel}
			intro={t(`${moduleId}Intro`)}
			steps={steps}
			moduleId={moduleId}
			initialStepId={stepId ?? undefined}
			prevLabel={t("previousStep")}
			nextLabel={t("nextStep")}
			nextModule={next && { href: next.href, label: t(next.labelKey) }}
		>
			{children?.(t)}
		</TrainingModulePage>
	);
}

/**
 * Pages d'un module de formation : la page du module (première étape, ou reprise de la
 * progression côté client) et une page par étape suivante, chacune rendue côté serveur avec
 * son propre contenu.
 */
export default function createTrainingModulePages(
	moduleId: TrainingModuleId,
	{ children }: { children?: (t: TrainingTranslator) => ReactNode } = {},
) {
	const { buildSteps } = TRAINING_MODULES[moduleId];
	const suffix = moduleId.toUpperCase();

	return {
		generateModuleMetadata: createGenerateMetadata(
			moduleEntryPathname(moduleId),
			`training${suffix}Title` as "trainingA1Title",
			`training${suffix}Description` as "trainingA1Description",
		),

		async ModulePage({ params }: ModuleParams) {
			const { locale } = await params;
			return renderModule(moduleId, locale, undefined, children);
		},

		generateStepStaticParams() {
			return routing.locales.flatMap((locale) =>
				buildModuleSteps(moduleId, locale)
					.slice(1)
					.map(({ id }) => ({
						locale,
						step: trainingStepSlug(locale, moduleId, id),
					})),
			);
		},

		async generateStepMetadata({ params }: StepParams): Promise<Metadata> {
			const { locale: rawLocale, step: stepSlug } = await params;
			const locale = toLocale(rawLocale);
			const [t, tMeta] = await Promise.all([
				getTranslations({ locale, namespace: "training" }),
				getTranslations({ locale, namespace: "public.metadata" }),
			]);
			const steps = buildSteps(t);
			const stepId = trainingStepIdFromSlug(
				locale,
				moduleId,
				stepSlug,
				steps.map((s) => s.id),
			);
			const step = steps.find((s) => s.id === stepId);
			if (!step) return {};

			const isTheory = step.kind === "theory";
			const key = `trainingSteps.${moduleId}.${stepId}` as "trainingSteps.a1.theory";
			const metadata = pageMetadata(
				locale,
				(l) => ({
					pathname: moduleStepPathname(moduleId),
					params: { step: trainingStepSlug(l, moduleId, step.id) },
				}),
				isTheory
					? tMeta(`${key}.title`)
					: tMeta("trainingStepFallbackTitle", {
							step: step.title,
							module: suffix,
						}),
				isTheory
					? tMeta(`${key}.description`)
					: tMeta(`training${suffix}Description` as "trainingA1Description"),
				{ absoluteTitle: true },
			);
			return isTheory
				? metadata
				: { ...metadata, robots: { index: false, follow: true } };
		},

		async StepPage({ params }: StepParams) {
			const { locale, step } = await params;
			return renderModule(moduleId, locale, step, children);
		},
	};
}
