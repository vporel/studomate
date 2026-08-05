import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import Section from "../section.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

/**
 * Trois garde-fous partagés par `ConnectionsAddCommand.execute` (autoritaire) et la validation
 * live d'un tracé manuel (`isValidConnection` de `<ReactFlow>`) :
 * - une bobine est toujours terminale : refuse toute connexion dont la source est une bobine ;
 * - une borne d'alimentation n'a pas de côté entrant : refuse toute connexion dont la cible en
 *   est une ;
 * - le courant ne revient jamais en arrière : refuse toute connexion dont la cible n'est pas
 *   strictement à droite de la source (`col` croissante), ce qui rend un cycle structurellement
 *   impossible sans avoir besoin de le détecter après coup.
 */
export function isConnectionAllowed(section: Section, sourceId: string, targetId: string): boolean {
	const source = section.getElement(sourceId);
	const target = section.getElement(targetId);
	if (!source || !target || source.type === "coil") return false;
	if (target.type === "railTerminal") return false;
	return target.position.col > source.position.col;
}

/**
 * Ajoute des connexions entre éléments existants d'une section — voir `isConnectionAllowed`
 * pour les garde-fous, appliqués pour rendre un état invalide impossible plutôt que de le
 * signaler après coup.
 */
export default class ConnectionsAddCommand extends AbstractLadderCommand<{
	sectionId: string;
	connections: Connection[];
}> {
	getType(): string {
		return "ladder-connections-add";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		const section = ladder.getSection(this.payload.sectionId);
		if (!section) return [ladder, false];
		for (const connection of this.payload.connections) {
			if (!isConnectionAllowed(section, connection.source.id, connection.target.id)) return [ladder, false];
		}
		ladder.addConnections(
			this.payload.sectionId,
			this.payload.connections.map((connection) => connection.copy()),
		);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		ladder.removeConnections(
			this.payload.sectionId,
			this.payload.connections.map((c) => ({ sourceId: c.source.id, targetId: c.target.id })),
		);
		return ladder;
	}
}
