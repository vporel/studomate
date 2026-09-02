import Ladder from "@/schemas/ladder/ladder.schema";
import Connection from "@/schemas/ladder/connection.schema";
import { ContactType, LadderElement } from "@/schemas/ladder/element.schema";
import { BlockElement } from "@/schemas/ladder/block.schema";
import {
	BLOCK_DEFINITIONS,
	resolveStructuralPorts,
} from "@/schemas/ladder/block-definition";
import { SimulationVariableState } from "@/ui/stores/project/project.store";
import {
	getBlockPortVariableMnemonic,
	getContactMemoryVariableId,
} from "@/project-analyser/analysers/ladder/ladder.analyser";

/**
 * Un contact laisse passer le courant selon son type et l'état de sa variable — pour les fronts
 * (P/N), `frontMemoryValue` est la valeur de la variable mémoire de front du contact au cycle
 * précédent (voir `getContactMemoryVariableId`). Partagé entre le calcul du parcours de puissance
 * (arêtes) et la surbrillance individuelle d'un contact (`ContactNode`).
 */
export function contactLetsPowerThrough(
	type: ContactType,
	variableValue: unknown,
	frontMemoryValue: unknown,
): boolean {
	switch (type) {
		case "NO":
			return variableValue === true;
		case "NF":
			return variableValue === false;
		case "P":
			return variableValue === true && frontMemoryValue === false;
		case "N":
			return variableValue === false && frontMemoryValue === true;
	}
	return false;
}

/**
 * Mnémonique de la variable qui porte l'état du port de sortie structurel d'un bloc (`Q` d'un
 * timer/compteur/compare, `ENO` d'un appel de programme / assign / arithmetic). Pour un
 * timer/compteur elle est exposée sous `<Nom>.Q` ; pour les autres c'est une variable mémoire
 * cachée. `null` si le bloc n'a pas de nom valide (timer/compteur) — le port n'a alors pas de
 * variable résoluble.
 */
function blockOutputMnemonic(block: BlockElement): string | null {
	const ports = resolveStructuralPorts(block.data);
	if (BLOCK_DEFINITIONS[block.data.blockType].portsAreExposedVariables) {
		const name = (block.data.params as { name?: string }).name;
		if (!name) return null;
		return `${name}.${ports.output}`;
	}
	return getBlockPortVariableMnemonic(block.id, ports.output);
}

let lastSimulationState: Record<string, SimulationVariableState> | null = null;
let lastLadder: Ladder | null = null;
let lastEnergizedEdges: Set<string> = new Set();

export function computeEnergizedEdges(
	ladder: Ladder,
	variablesState: Record<string, SimulationVariableState>,
): Set<string> {
	if (ladder === lastLadder && variablesState === lastSimulationState) {
		return lastEnergizedEdges;
	}

	// Index construits une fois pour ce calcul (l'appelant, un composant par connexion, retombe
	// sur le cache mono-entrée pour les suivantes du même rendu).
	const elementsById = new Map<string, LadderElement>();
	for (const element of ladder.getAllElements()) {
		elementsById.set(element.id, element);
	}
	const connectionsBySource = new Map<string, Connection[]>();
	for (const { connection } of ladder.getAllConnections()) {
		const list = connectionsBySource.get(connection.source.id);
		if (list) list.push(connection);
		else connectionsBySource.set(connection.source.id, [connection]);
	}
	const valueByMnemonic = new Map<string, unknown>();
	for (const state of Object.values(variablesState)) {
		valueByMnemonic.set(state.mnemonic, state.value);
	}

	// Étape 1 : quels nœuds laissent passer le courant (logique interne validée)
	const passesPower = (nodeId: string): boolean => {
		const element = elementsById.get(nodeId);
		if (!element) return false;
		if (element.type === "railTerminal") return true; // Le rail est la source, il laisse toujours passer
		if (element.type === "coil") return false; // Une bobine est un puits, elle ne transmet pas le courant
		if (element.type === "block") {
			// La sortie structurelle du bloc porte l'état à propager : `ENO` (toujours vrai pour un
			// appel de programme / assign / arithmetic) ou `Q` (timer non échu, compteur, comparaison
			// fausse → le rail est coupé en aval).
			const mnemonic = blockOutputMnemonic(element);
			return mnemonic !== null && valueByMnemonic.get(mnemonic) === true;
		}

		const contact = element;
		const state = valueByMnemonic.get(contact.data.variable);
		const memVarId = getContactMemoryVariableId(ladder.id, contact.id);
		return contactLetsPowerThrough(
			contact.data.type,
			state,
			variablesState[memVarId]?.value,
		);
	};

	// Étape 2 : parcours en largeur depuis les rails d'alimentation. `head` avance sur `queue`
	// plutôt qu'un `queue.shift()` en O(n).
	const energizedEdges = new Set<string>();
	const queue: string[] = [];
	for (const element of elementsById.values()) {
		if (element.type === "railTerminal") queue.push(element.id);
	}
	const visitedNodes = new Set<string>();

	for (let head = 0; head < queue.length; head++) {
		const currentNodeId = queue[head];
		if (visitedNodes.has(currentNodeId)) continue;
		visitedNodes.add(currentNodeId);

		if (passesPower(currentNodeId)) {
			for (const connection of connectionsBySource.get(currentNodeId) ?? []) {
				energizedEdges.add(connection.id);
				queue.push(connection.target.id);
			}
		}
	}

	lastLadder = ladder;
	lastSimulationState = variablesState;
	lastEnergizedEdges = energizedEdges;
	return energizedEdges;
}
