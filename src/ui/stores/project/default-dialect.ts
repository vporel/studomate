import { Dialect } from "@/expression-language/dialect.enum";
import {
	getDefaultDialect,
	setDefaultDialect,
} from "@/persistence/preferences.storage";
import type { ProjectStoreEnvironment } from "./environment/project-store-environment";
import { ProjectStoreSetFunction } from "./project.store.types";

function openDefaultDialectModal(
	set: ProjectStoreSetFunction,
): Promise<Dialect | null> {
	return new Promise((resolve) => {
		set((state) => ({
			ui: {
				...state.ui,
				defaultDialectModalVisible: true,
				onDefaultDialectChosen: (dialect) => {
					set((state) => ({
						ui: {
							...state.ui,
							defaultDialectModalVisible: false,
							onDefaultDialectChosen: null,
						},
					}));
					resolve(dialect);
				},
			},
		}));
	});
}

/**
 * Dialecte d'un nouveau projet vierge : la préférence enregistrée, sinon le choix fait dans la
 * popup de préférences, qui devient alors la préférence. Fermer la popup sans valider applique
 * la valeur proposée à ce projet seulement. Sans persistance (bloc embarqué), le dialecte reste
 * celui du schéma.
 */
export default async function resolveDefaultDialect(
	set: ProjectStoreSetFunction,
	env: ProjectStoreEnvironment,
): Promise<Dialect | undefined> {
	if (!env.persistence) return undefined;
	const preferred = getDefaultDialect();
	if (preferred) return preferred;

	const chosen = await openDefaultDialectModal(set);
	if (chosen) setDefaultDialect(chosen);
	return chosen ?? suggestedDialect(env);
}

/** Dialecte proposé d'office dans la popup : celui de la langue de l'interface. */
function suggestedDialect(env: ProjectStoreEnvironment): Dialect {
	return env.getLocale() === "en" ? Dialect.EN : Dialect.FR;
}
