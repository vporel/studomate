import Connection from "@/schemas/ladder/connection.schema";
import { LadderElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";

/**
 * Fabrique de topologies Ladder pour les tests : construit une `Section` et câble ses éléments
 * (contact/bobine/borne d'alimentation) sans répéter à la main la construction des `Connection`.
 * Le champ `type` porté par chaque bout de connexion n'est lu par aucun analyseur/pré-compilateur
 * (seul l'`id` sert à la résolution) — il est renseigné ici uniquement pour rester lisible.
 */

export function createSectionWith(
	elements: LadderElement[],
	connections: Connection[] = [],
	id: string = createRandomId(),
	title: string = "S",
): Section {
	return new Section(id, title, "", elements, connections);
}

function connect(from: LadderElement, to: LadderElement): Connection {
	return new Connection(
		createRandomId(),
		{ id: from.id, type: from.type, handle: "source" },
		{ id: to.id, type: to.type, handle: "target" },
	);
}

/** Chaîne chaque élément au suivant (ET implicite : rail → élément1 → élément2 → ... → bobine). */
export function wireInSeries(elements: LadderElement[]): Connection[] {
	const connections: Connection[] = [];
	for (let i = 0; i < elements.length - 1; i++) {
		connections.push(connect(elements[i], elements[i + 1]));
	}
	return connections;
}

/** Relie `from` à chacune des `branches`, puis chaque branche à `to` (OU : divergence/convergence). */
export function wireInParallel(from: LadderElement, branches: LadderElement[], to: LadderElement): Connection[] {
	const connections: Connection[] = [];
	for (const branch of branches) {
		connections.push(connect(from, branch), connect(branch, to));
	}
	return connections;
}
