import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";
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
export function createLadderGateProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-gate", locale);
	const project = new Project(createRandomId(), t("projectName"), "");
	project.variables.push(output("ouvrir"), output("fermer"));
	return project;
}

/** Stop button, limit switches, photocell and outputs shared by every gate exercise. */
export function createGateCommonVariables(_locale: Locale = "fr"): Variable[] {
	return [
		stopButton("arret"),
		input("fc_ouvert"),
		input("fc_ferme"),
		input("barriere_immaterielle"),
		output("ouvrir"),
		output("fermer"),
	];
}

export function createLadderGateSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("ladder-gate", locale);
	const project = new Project(createRandomId(), t("solutionName"), "");
	project.variables.push(
		pushButton("bp_ouvrir"),
		pushButton("bp_fermer"),
		...createGateCommonVariables(locale),
	);
	setMainSections(project, [
		section(
			t("openTitle"),
			t("openDescription"),
			no("bp_ouvrir"),
			nf("fermer"),
			setCoil("ouvrir"),
		),
		section(
			t("closeTitle"),
			t("closeDescription"),
			no("bp_fermer"),
			nf("ouvrir"),
			setCoil("fermer"),
		),
		section(
			t("reopenTitle"),
			t("reopenDescription"),
			no("barriere_immaterielle"),
			no("fermer"),
			or([setCoil("ouvrir")], [resetCoil("fermer")]),
		),
		section(
			t("stopOpeningTitle"),
			t("stopOpeningDescription"),
			or([nf("arret")], [no("fc_ouvert")]),
			resetCoil("ouvrir"),
		),
		section(
			t("stopClosingTitle"),
			t("stopClosingDescription"),
			or([nf("arret")], [no("fc_ferme")]),
			resetCoil("fermer"),
		),
	]);
	return project;
}
