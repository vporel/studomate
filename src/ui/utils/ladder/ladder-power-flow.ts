import Ladder from "@/schemas/ladder/ladder.schema";
import Connection from "@/schemas/ladder/connection.schema";
import { LadderElement } from "@/schemas/ladder/element.schema";
import { SimulationVariableState } from "@/ui/stores/project/project.store";
import { getContactMemoryVariableId } from "@/project-analyser/analysers/ladder/ladder.analyser";

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
		if (element.type === "block") return true; // Un bloc relaie toujours son alimentation (ENO = EN)

		const contact = element;
		const state = valueByMnemonic.get(contact.data.variable);

		switch (contact.data.mode) {
			case "NO":
				return state === true;
			case "NF":
				return state === false;
			case "P": {
				const memVarId = getContactMemoryVariableId(ladder.id, contact.id);
				const memVar = variablesState[memVarId]?.value;
				return state === true && memVar === false;
			}
			case "N": {
				const memVarId = getContactMemoryVariableId(ladder.id, contact.id);
				const memVar = variablesState[memVarId]?.value;
				return state === false && memVar === true;
			}
		}
		return false;
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
