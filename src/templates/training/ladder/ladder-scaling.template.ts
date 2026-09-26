import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	arithmetic,
	assign,
	convert,
	rising,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	createTankControlSections,
	createTankVariables,
} from "./ladder-tank.template";
import { analogInput, memory } from "@/templates/training/utils/training-variables";

export const RAW_MAX = 27648;

function createScalingVariables(project: Project): void {
	createTankVariables(project, false);
	project.variables.push(
		analogInput("brut", 0, RAW_MAX),
		memory("calcul_real", "REAL"),
		memory("calcul_dint", "DINT"),
	);
}

function createCountSection() {
	return section(
		"Compteur de démarrages",
		"Un contact P n'incrémente qu'une fois par démarrage.",
		rising("pompe"),
		arithmetic("nb_demarrages", "nb_demarrages", "+", "1"),
	);
}

/** The Main holds the tank solution; `niveau` is now computed from `brut`, not an input. */
export function createLadderScalingProject(): Project {
	const project = new Project(createRandomId(), "Mise à l'échelle", "");
	createScalingVariables(project);
	setMainSections(project, [...createTankControlSections(), createCountSection()]);
	return project;
}

/** Scaling in a `REAL` intermediate, then narrowing with `REAL_TO_INT`. */
export function createLadderScalingSolution(): Project {
	const project = new Project(createRandomId(), "Mise à l'échelle : solution", "");
	createScalingVariables(project);
	setMainSections(project, [
		section("Copie de la valeur brute", "L'élargissement INT vers REAL est implicite.", assign("calcul_real", "brut")),
		section("Multiplication", "Calcul en REAL : pas de dépassement.", arithmetic("calcul_real", "calcul_real", "*", "100")),
		section("Division", "Division en REAL : pas de troncature.", arithmetic("calcul_real", "calcul_real", "/", `${RAW_MAX}`)),
		section("Retour en INT", "Le rétrécissement doit être explicite.", convert("niveau", "calcul_real")),
		...createTankControlSections(),
		createCountSection(),
	]);
	return project;
}
