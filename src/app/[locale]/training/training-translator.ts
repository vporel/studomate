import type { getTranslations } from "next-intl/server";

/** Traducteur du namespace `training`, tel que renvoyé par `getTranslations` côté serveur. */
export type TrainingTranslator = Awaited<
	ReturnType<typeof getTranslations<"training">>
>;
