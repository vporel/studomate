import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { createRandomId } from "@/ids";
import {
	nf,
	no,
	or,
	resetCoil,
	section,
	setCoil,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import {
	input,
	output,
	pushButton,
	stopButton,
} from "@/templates/training/utils/training-variables";

/** Partial table: only the outputs are declared, the student declares the inputs. */
export function createLadderGateProject(): Project {
	const project = new Project(createRandomId(), "Portail motorisé", "");
	project.variables.push(output("ouvrir"), output("fermer"));
	return project;
}

/** Stop button, limit switches, photocell and outputs shared by every gate exercise. */
export function createGateCommonVariables(): Variable[] {
	return [
		stopButton("arret"),
		input("fc_ouvert"),
		input("fc_ferme"),
		input("barriere_immaterielle"),
		output("ouvrir"),
		output("fermer"),
	];
}

export function createLadderGateSolution(): Project {
	const project = new Project(createRandomId(), "Portail motorisé : solution", "");
	project.variables.push(
		pushButton("bp_ouvrir"),
		pushButton("bp_fermer"),
		...createGateCommonVariables(),
	);
	setMainSections(project, [
		section("Ouverture", "Ordre d'ouverture, verrouillé par la fermeture.", no("bp_ouvrir"), nf("fermer"), setCoil("ouvrir")),
		section("Fermeture", "Ordre de fermeture, verrouillé par l'ouverture.", no("bp_fermer"), nf("ouvrir"), setCoil("fermer")),
		section(
			"Réouverture sur barrière immatérielle",
			"Barrière immatérielle coupée pendant la fermeture : la fermeture s'arrête et le portail se rouvre.",
			no("barriere_immaterielle"),
			no("fermer"),
			or([setCoil("ouvrir")], [resetCoil("fermer")]),
		),
		section(
			"Arrêt de l'ouverture",
			"Arrêt (contact NF) ou fin de course ouvert : le mouvement s'arrête, l'arrêt l'emporte.",
			or([nf("arret")], [no("fc_ouvert")]),
			resetCoil("ouvrir"),
		),
		section(
			"Arrêt de la fermeture",
			"Arrêt (contact NF) ou fin de course fermé.",
			or([nf("arret")], [no("fc_ferme")]),
			resetCoil("fermer"),
		),
	]);
	return project;
}
