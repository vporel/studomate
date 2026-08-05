import Ladder from "@/schemas/ladder/ladder.schema";
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

	const energizedEdges = new Set<string>();
	const connections = ladder.getAllConnections().map((c) => c.connection);

	// Étape 1 : Identifier quels nœuds laissent passer le courant (logique interne validée)
	const passesPower = (nodeId: string): boolean => {
		const element = ladder.findElement(nodeId)?.element;
		if (!element) return false;
		if (element.type === "railTerminal") return true; // Le rail est la source, il laisse toujours passer
		if (element.type === "coil") return false; // Une bobine est un puits, elle ne transmet pas le courant

		const contact = element;
		const variable = contact.data.variable;
		const state = Object.values(variablesState).find((v) => v.mnemonic === variable)?.value;

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

	// Étape 2 : Parcours en largeur (BFS) depuis les rails d'alimentation
	const queue: string[] = []; // File des IDs des nœuds qui REÇOIVENT du courant

	// Trouver toutes les sources (railTerminal)
	for (const element of ladder.getAllElements()) {
		if (element.type === "railTerminal") {
			queue.push(element.id);
		}
	}

	const visitedNodes = new Set<string>();

	while (queue.length > 0) {
		const currentNodeId = queue.shift()!;
		if (visitedNodes.has(currentNodeId)) continue;
		visitedNodes.add(currentNodeId);

		// Si le courant arrive au nœud et qu'il le laisse passer, alors ses arêtes sortantes s'allument
		if (passesPower(currentNodeId)) {
			// Trouver toutes les arêtes sortantes de ce nœud
			const outgoingConnections = connections.filter((c) => c.source.id === currentNodeId);
			for (const connection of outgoingConnections) {
				energizedEdges.add(connection.id);
				// Le nœud cible reçoit donc du courant, on l'ajoute à la file
				queue.push(connection.target.id);
			}
		}
	}

	lastLadder = ladder;
	lastSimulationState = variablesState;
	lastEnergizedEdges = energizedEdges;
	return energizedEdges;
}
