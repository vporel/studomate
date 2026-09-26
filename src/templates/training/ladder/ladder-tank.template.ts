import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import {
	arithmetic,
	coil,
	compare,
	no,
	resetCoil,
	rising,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	analogInput,
	memory,
	output,
} from "@/templates/training/utils/training-variables";

export const LEVEL_LOW = 20;
export const LEVEL_HIGH = 80;
export const LEVEL_ALARM = 95;

export function createTankVariables(project: Project, levelIsInput: boolean): void {
	project.variables.push(
		levelIsInput ? analogInput("niveau", 0, 100) : memory("niveau", "INT"),
		output("pompe"),
		output("alarme"),
		memory("nb_demarrages", "INT"),
	);
}

/** Pump hysteresis (compare + memory) and high-level alarm. */
export function createTankControlSections(): Section[] {
	return [
		section("Démarrage de la pompe", "Niveau bas : mémoriser la marche.", compare("niveau", "<", `${LEVEL_LOW}`), setCoil("pompe")),
		section("Arrêt de la pompe", "Niveau haut : arrêter.", compare("niveau", ">", `${LEVEL_HIGH}`), resetCoil("pompe")),
		section("Alarme", "Niveau très haut.", compare("niveau", ">", `${LEVEL_ALARM}`), coil("alarme")),
	];
}

/** The Main increments a counter under a NO contact: it counts on every scan. */
export function createLadderTankProject(): Project {
	const project = new Project(createRandomId(), "Cuve", "");
	createTankVariables(project, true);
	setMainSections(project, [
		section(
			"Compteur de démarrages",
			"Le bloc s'exécute à chaque cycle tant que la pompe est en marche.",
			no("pompe"),
			arithmetic("nb_demarrages", "nb_demarrages", "+", "1"),
		),
	]);
	return project;
}

export function createLadderTankSolution(): Project {
	const project = new Project(createRandomId(), "Cuve : solution", "");
	createTankVariables(project, true);
	setMainSections(project, [
		...createTankControlSections(),
		section(
			"Compteur de démarrages",
			"Un contact P n'incrémente qu'une fois par démarrage.",
			rising("pompe"),
			arithmetic("nb_demarrages", "nb_demarrages", "+", "1"),
		),
	]);
	return project;
}
