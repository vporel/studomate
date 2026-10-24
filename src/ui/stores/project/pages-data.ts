import type { PageData } from "./project.store.types";
import {
	getVariablesPageDefinition,
	type VariablesPageId,
} from "./variables-pages";

export const PROJECT_STARTUP_PAGE_ID = "project-startup";
export const PROJECT_STARTUP_PAGE_DATA: PageData = {
	id: PROJECT_STARTUP_PAGE_ID,
	type: "project-startup",
	title: "Démarrage",
};

export const PROJECT_PROPERTIES_PAGE_ID = "project-properties";
export const PROJECT_PROPERTIES_PAGE_DATA: PageData = {
	id: PROJECT_PROPERTIES_PAGE_ID,
	type: "project-properties",
	title: "Propriétés du projet",
};

export const EXERCISE_PAGE_ID = "exercise";
export const EXERCISE_PAGE_DATA: PageData = {
	id: EXERCISE_PAGE_ID,
	type: "exercise",
	title: "Énoncé de l'exercice",
};

export const HARDWARE_CONFIGURATION_PAGE_ID = "hardware-configuration";
export const HARDWARE_CONFIGURATION_PAGE_DATA: PageData = {
	id: HARDWARE_CONFIGURATION_PAGE_ID,
	type: "hardware-configuration",
	title: "Configuration matérielle",
};

export const SCENE3D_CONFIGURATION_PAGE_ID = "scene3d-configuration";
export const SCENE3D_CONFIGURATION_PAGE_DATA: PageData = {
	id: SCENE3D_CONFIGURATION_PAGE_ID,
	type: "scene3d-configuration",
	title: "Configuration scène 3D",
};

export const SYSTEM_VARIABLES_PAGE_ID = "system-variables";
export const SYSTEM_VARIABLES_PAGE_DATA: PageData = {
	id: SYSTEM_VARIABLES_PAGE_ID,
	type: "system-variables",
	title: "Variables système",
};

export const PREFERENCES_PAGE_ID = "preferences";
export const PREFERENCES_PAGE_DATA: PageData = {
	id: PREFERENCES_PAGE_ID,
	type: "preferences",
	title: "Préférences",
};

export function getVariablesPageData(pageId: VariablesPageId): PageData {
	return {
		id: pageId,
		type: "variables",
		title: getVariablesPageDefinition(pageId).title,
	};
}
