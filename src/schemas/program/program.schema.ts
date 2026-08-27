/**
 * Les notations dans lesquelles un programme peut être écrit.
 */
import { Dialect } from "@/expression-language/dialect.enum";

export const PROGRAM_TYPES = ["grafcet", "ladder"] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
	grafcet: "Grafcet",
	ladder: "Ladder",
};

/**
 * Un programme porté par un projet — une unité de logique exécutable, quelle que soit la
 * notation. Ne porte que ce que le niveau projet doit connaître : identité, nom et notation ;
 * tout le reste est spécifique à la notation et y reste.
 */
export default abstract class Program {
	id: string;
	name: string;
	abstract readonly type: ProgramType;

	constructor(id: string, name: string) {
		this.id = id;
		this.name = name;
	}

	abstract copy(): Program;

	/**
	 * Traduit les mots-clés des expressions de la notation d'un dialecte vers l'autre (voir
	 * `Project.setDialect`). Sans objet — et donc non implémentée — pour une notation dont les
	 * éléments référencent les variables par mnémonique sans expression textuelle (Ladder).
	 */
	translateExpressionsKeywords?(from: Dialect, to: Dialect): void;
}
