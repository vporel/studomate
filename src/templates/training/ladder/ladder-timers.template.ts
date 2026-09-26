import Project from "@/schemas/project/project.schema";
import { createRandomId } from "@/ids";
import {
	coil,
	nf,
	no,
	or,
	section,
	setMainSections,
	timer,
} from "@/templates/training/utils/ladder-dsl";
import {
	output,
	pushButton,
	toggleSwitch,
} from "@/templates/training/utils/training-variables";

export function createLadderTimersProject(): Project {
	const project = new Project(createRandomId(), "Démarrage étoile-triangle", "");
	project.variables.push(
		pushButton("marche"),
		pushButton("arret"),
		output("km_ligne"),
		output("km_etoile"),
		output("km_triangle"),
		output("ventilateur"),
		toggleSwitch("inter_clignotant"),
		output("voyant"),
	);
	return project;
}

/**
 * Star-delta start (line + star, then delta after a `TON`), cooling fan held by a `TOF`, and a
 * blinker made of two crossed `TON`s.
 */
export function createLadderTimersSolution(): Project {
	const project = createLadderTimersProject();
	project.name = "Démarrage étoile-triangle : solution";
	setMainSections(project, [
		section(
			"Contacteur de ligne",
			"Auto-maintien à arrêt prioritaire.",
			or([no("marche")], [no("km_ligne")]),
			nf("arret"),
			coil("km_ligne"),
		),
		section("Temps de démarrage", "Le TON mesure la durée en étoile.", no("km_ligne"), timer("TON", "t_etoile", "T#5s")),
		section(
			"Étoile",
			"Étoile pendant le démarrage, verrouillé par le triangle.",
			no("km_ligne"),
			nf("t_etoile.Q"),
			nf("km_triangle"),
			coil("km_etoile"),
		),
		section(
			"Triangle",
			"Triangle après la temporisation, verrouillé par l'étoile.",
			no("km_ligne"),
			no("t_etoile.Q"),
			nf("km_etoile"),
			coil("km_triangle"),
		),
		section(
			"Ventilateur",
			"Le TOF prolonge la ventilation de 10 s après l'arrêt du moteur.",
			no("km_ligne"),
			timer("TOF", "t_ventilo", "T#10s"),
			coil("ventilateur"),
		),
		section(
			"Clignotant : phase éteinte",
			"Premier TON, armé tant que le second n'a pas terminé.",
			no("inter_clignotant"),
			nf("t_phase_haute.Q"),
			timer("TON", "t_phase_basse", "T#1s"),
		),
		section(
			"Clignotant : phase allumée",
			"Second TON, armé pendant la phase allumée.",
			no("t_phase_basse.Q"),
			timer("TON", "t_phase_haute", "T#1s"),
		),
		section("Voyant", "Le voyant suit la phase allumée.", no("t_phase_basse.Q"), coil("voyant")),
	]);
	return project;
}
