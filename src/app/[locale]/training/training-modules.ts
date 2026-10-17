import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { PublicPathname } from "@/i18n/routing";
import { createTranslator } from "next-intl";
import type { StepData } from "./ModuleStepper";
import buildA0Steps from "./a0/steps";
import buildA1Steps from "./a1/steps";
import buildA2Steps from "./a2/steps";
import buildA3Steps from "./a3/steps";
import buildA4Steps from "./a4/steps";
import type { TrainingModuleId } from "./training-module-ids";
import type { TrainingTranslator } from "./training-translator";


type TrainingModule = {
	buildSteps: (t: TrainingTranslator) => StepData[];
	/** Module suivant du parcours et clé du libellé de son lien dans `training`. */
	next?: { href: PublicPathname; labelKey: "nextModuleA1Cta" | "nextModuleA2Cta" | "nextModuleA3Cta" | "nextModuleA4Cta" };
};

export const TRAINING_MODULES: Record<TrainingModuleId, TrainingModule> = {
	a0: {
		buildSteps: buildA0Steps,
		next: { href: "/training/a1", labelKey: "nextModuleA1Cta" },
	},
	a1: {
		buildSteps: buildA1Steps,
		next: { href: "/training/a2", labelKey: "nextModuleA2Cta" },
	},
	a2: {
		buildSteps: buildA2Steps,
		next: { href: "/training/a3", labelKey: "nextModuleA3Cta" },
	},
	a3: {
		buildSteps: buildA3Steps,
		next: { href: "/training/a4", labelKey: "nextModuleA4Cta" },
	},
	a4: { buildSteps: buildA4Steps },
};

/** Tout module de formation est servi à `/training/<module>` ; ses étapes (hors la première,
 * servie par la page du module) à `/training/<module>/[step]`. */
export function moduleEntryPathname(moduleId: TrainingModuleId): PublicPathname {
	return `/training/${moduleId}`;
}

export function moduleStepPathname(moduleId: TrainingModuleId) {
	return `/training/${moduleId}/[step]` as const;
}

/** Étapes d'un module hors contexte de requête (sitemap, `generateStaticParams`). */
export function buildModuleSteps(
	moduleId: TrainingModuleId,
	locale: Locale,
): StepData[] {
	const t = createTranslator({
		locale,
		messages: getMessages(locale),
		namespace: "training",
	});
	return TRAINING_MODULES[moduleId].buildSteps(t);
}
