import { Dialect } from "@/expression-language/dialect.enum";
import Grafcet, { GrafcetFormat } from "../grafcet/grafcet.schema";
import Ladder, { DEFAULT_MAIN_NAME } from "../ladder/ladder.schema";
import Program, { ProgramType } from "../program/program.schema";
import { createRandomId } from "@/ids";
import { nextAvailableName } from "@/lib/naming";
import Variable from "../variable/variable.schema";
import { getCounterBlockParams } from "../function-blocks/counter.schema";
import { getTimerBlockParams } from "../function-blocks/timer.schema";
import { BlockElement, BlockType } from "../ladder/block.schema";
import HmiPage from "../hmi/hmi-page.schema";

export const DEFAULT_PROJECT_NAME = "Nouveau projet";

/**
 * Version de la **forme d'un projet**. À incrémenter quand la structure change, en ajoutant
 * la migration correspondante.
 *
 * Déclarée ici, dans le schéma, et non dans la couche persistance : c'est le projet qui
 * définit sa propre forme. La persistance la lit pour savoir quelles migrations appliquer —
 * dépendance dans ce sens, jamais l'inverse.
 *
 * Portée **par chaque projet**, et non par le stockage : deux projets de versions différentes
 * peuvent ainsi cohabiter, et une version ancienne de l'application peut lister tous les
 * projets tout en refusant proprement d'ouvrir ceux qui la dépassent.
 */
export const PROJECT_SCHEMA_VERSION = 1;

export default class Project {
	id: string;
	schemaVersion: number;
	name: string;
	creationDate: Date;
	lastModificationDate: Date;
	author?: string;
	/**
	 * Dialecte dans lequel les expressions du projet sont écrites (`ET` ou `AND`).
	 *
	 * Propriété du **projet**, et non préférence de l'utilisateur : les expressions sont
	 * stockées en texte, donc le dialecte qui les a écrites doit voyager avec elles. Sans
	 * quoi un projet rédigé en anglais deviendrait illisible chez quelqu'un réglé en français.
	 */
	dialect: Dialect;
	variables: Variable[];
	/**
	 * Les programmes du projet, toutes notations confondues. Le niveau projet ne connaît
	 * que `Program` ; chaque notation garde ses spécificités chez elle.
	 */
	programs: Record<string, Program>;
	/** Pages HMI du projet, indexées par id. */
	hmiPages: Record<string, HmiPage>;

	constructor(id: string, name: string, author: string) {
		this.id = id;
		this.schemaVersion = PROJECT_SCHEMA_VERSION;
		this.name = name;
		this.creationDate = new Date();
		this.lastModificationDate = new Date();
		this.author = author;
		this.dialect = Dialect.FR;
		this.variables = [];
		this.programs = {};
		this.hmiPages = {};
		// Chaque projet porte toujours un Main — voir `createMain`.
		this.createMain();
	}

	//=============== PROGRAMMES, TOUTES NOTATIONS ===============

	getProgram(programId: string): Program | undefined {
		return this.programs[programId];
	}

	/**
	 * Vue calculée : un nouveau `Record` est construit à chaque appel. Le capturer dans une
	 * variable plutôt que relire `project.ladders`/`project.grafcets` en boucle.
	 */
	getProgramsOfType<T extends Program>(type: ProgramType): Record<string, T> {
		const result: Record<string, T> = {};
		for (const id in this.programs) {
			if (this.programs[id].type === type) result[id] = this.programs[id] as T;
		}
		return result;
	}

	addProgram(program: Program): void {
		if (this.programs[program.id]) {
			throw new Error(
				`Program with id ${program.id} already exists in the project.`,
			);
		}
		this.programs[program.id] = program;
		this.touch();
	}

	updateProgram(program: Program) {
		this.programs[program.id] = program;
		this.touch();
	}

	/** Nom auto-généré au format "Label_N" pour un nouveau programme — unique parmi tous les
	 * programmes du projet, indépendamment de leur type (ladders et grafcets partagent le même
	 * dossier dans l'explorateur, donc le même espace de noms). */
	nextProgramName(label: string): string {
		return nextAvailableName(
			label,
			Object.values(this.programs).map((program) => program.name),
		);
	}

	/** Ne supprime jamais le Main : un projet en porte toujours exactement un. */
	deleteProgram(programId: string) {
		const program = this.programs[programId];
		if (program instanceof Ladder && program.role === "main") return;
		delete this.programs[programId];
		this.touch();
	}

	//=============== GRAFCET ===============
	//Accesseurs typés, pour que le code propre au GRAFCET n'ait pas à transtyper partout

	get grafcets(): Record<string, Grafcet> {
		return this.getProgramsOfType<Grafcet>("grafcet");
	}

	getGrafcet(grafcetId: string): Grafcet | undefined {
		const program = this.programs[grafcetId];
		return program?.type === "grafcet" ? (program as Grafcet) : undefined;
	}

	createGrafcet(name: string, format: GrafcetFormat): Grafcet {
		const grafcet = new Grafcet(createRandomId(), name, format);
		this.addProgram(grafcet);
		return grafcet;
	}

	//=============== LADDER ===============
	//Accesseurs typés, pour que le code propre au Ladder n'ait pas à transtyper partout

	get ladders(): Record<string, Ladder> {
		return this.getProgramsOfType<Ladder>("ladder");
	}

	getLadder(ladderId: string): Ladder | undefined {
		const program = this.programs[ladderId];
		return program?.type === "ladder" ? (program as Ladder) : undefined;
	}

	createLadder(name: string): Ladder {
		const ladder = new Ladder(createRandomId(), name);
		this.addProgram(ladder);
		return ladder;
	}

	//=============== HMI ===============

	getHmiPage(hmiPageId: string): HmiPage | undefined {
		return this.hmiPages[hmiPageId];
	}

	/** Même principe que `nextProgramName`, pour une nouvelle page HMI. */
	nextHmiPageName(label: string): string {
		return nextAvailableName(
			label,
			Object.values(this.hmiPages).map((page) => page.name),
		);
	}

	createHmiPage(name: string): HmiPage {
		// La toute première page HMI du projet devient automatiquement la page principale (voir
		// `HmiPage.isMain`) — sans ça, aucune page n'en porterait tant que l'utilisateur n'ouvre pas
		// le panel de propriétés pour en désigner une.
		const isMain = Object.keys(this.hmiPages).length === 0;
		const page = HmiPage.create(name, isMain);
		this.hmiPages[page.id] = page;
		this.touch();
		return page;
	}

	updateHmiPage(page: HmiPage): void {
		this.hmiPages[page.id] = page;
		this.touch();
	}

	deleteHmiPage(hmiPageId: string): void {
		delete this.hmiPages[hmiPageId];
		this.touch();
	}

	/** Page affichée par défaut par la vue simulation HMI (voir `HmiSimulationPageView`) — celle
	 * marquée `isMain`, ou la première du projet si aucune ne l'est encore (ex. projet migré avant
	 * l'introduction de ce champ, voir `v0-to-v1`). */
	getMainHmiPage(): HmiPage | undefined {
		return (
			Object.values(this.hmiPages).find((page) => page.isMain) ??
			Object.values(this.hmiPages)[0]
		);
	}

	/** Une seule page principale à la fois : les autres perdent le statut. */
	setMainHmiPage(hmiPageId: string): void {
		for (const id in this.hmiPages) {
			this.hmiPages[id].isMain = id === hmiPageId;
		}
		this.touch();
	}

	//=============== MAIN ===============

	/** Le programme Main du projet — invariant garanti par le constructeur/`deleteProgram`. */
	get main(): Ladder {
		const found = Object.values(this.programs).find(
			(program): program is Ladder =>
				program.type === "ladder" && (program as Ladder).role === "main",
		);
		if (!found)
			throw new Error("Project has no Main program — invariant violated.");
		return found;
	}

	createMain(name: string = DEFAULT_MAIN_NAME): Ladder {
		const existing = Object.values(this.programs).some(
			(program) =>
				program.type === "ladder" && (program as Ladder).role === "main",
		);
		if (existing) throw new Error("A project can only have one Main program.");
		const main = new Ladder(createRandomId(), name, undefined, "main");
		this.addProgram(main);
		return main;
	}

	//=============== BLOCS SYSTÈME ===============

	/**
	 * Tous les blocs timer du projet, tous ladders confondus — pas de registre dédié, la config
	 * vivant directement dans chaque `BlockElement` (voir `TimerBlockParams`).
	 */
	getAllTimerBlockElements(): { ladder: Ladder; element: BlockElement }[] {
		return this.getAllBlockElements("timer");
	}

	/**
	 * Tous les blocs compteur du projet, tous ladders confondus — même principe que
	 * `getAllTimerBlockElements`.
	 */
	getAllCounterBlockElements(): { ladder: Ladder; element: BlockElement }[] {
		return this.getAllBlockElements("counter");
	}

	private getAllBlockElements(
		blockType: BlockType,
	): { ladder: Ladder; element: BlockElement }[] {
		return Object.values(this.ladders).flatMap((ladder) =>
			ladder
				.getAllElements()
				.filter(
					(element): element is BlockElement =>
						element.type === "block" && element.data.blockType === blockType,
				)
				.map((element) => ({ ladder, element })),
		);
	}

	/** Un nom de bloc partage son espace de noms avec les mnémoniques de variable : il doit être
	 * unique parmi les deux. */
	isNameTaken(name: string): boolean {
		if (this.variables.some((variable) => variable.mnemonic === name))
			return true;
		if (
			this.getAllTimerBlockElements().some(
				({ element }) => getTimerBlockParams(element)?.name === name,
			)
		) {
			return true;
		}
		return this.getAllCounterBlockElements().some(
			({ element }) => getCounterBlockParams(element)?.name === name,
		);
	}

	/**
	 * Change le dialecte du projet en traduisant les mots-clés de toutes les expressions.
	 *
	 * Sans cette traduction, passer de FR à EN rendrait chaque `ET` méconnaissable : l'analyse
	 * le prendrait pour un identifiant inconnu.
	 *
	 * Le Ladder n'est pas concerné : ses contacts/bobines référencent une variable par simple
	 * mnémonique, sans expression textuelle à traduire.
	 */
	setDialect(dialect: Dialect): void {
		if (dialect === this.dialect) return;
		const from = this.dialect;
		Object.values(this.programs).forEach((program) => {
			program.translateExpressionsKeywords?.(from, dialect);
		});
		this.dialect = dialect;
		this.touch();
	}

	touch() {
		this.lastModificationDate = new Date();
	}

	/**
	 * Reconstruit une instance sans repasser par le constructeur — donc sans fabriquer de Main :
	 * le Main fait partie des données réhydratées (`copy`/`createFromJSON` réassignent `programs`
	 * juste après), ce n'est pas au moteur de reconstruction de le créer.
	 */
	private static rehydrate(source: object): Project {
		return Object.assign(Object.create(Project.prototype) as Project, source);
	}

	copy(): Project {
		const newProject = Project.rehydrate(this);
		// Copie superficielle : les `Variable` sont immuables (voir `Variable.update`), donc les
		// instances inchangées sont réutilisées par référence — seul le tableau doit être distinct
		// (les commandes add/remove le mutent en place).
		newProject.variables = this.variables.slice();
		newProject.programs = {};
		for (const programId in this.programs) {
			newProject.programs[programId] = this.programs[programId].copy();
		}
		newProject.hmiPages = {};
		for (const hmiPageId in this.hmiPages) {
			newProject.hmiPages[hmiPageId] = this.hmiPages[hmiPageId].copy();
		}
		return newProject;
	}

	/**
	 * Copie du projet où seul `program` est remplacé — les autres programmes, les pages HMI et
	 * les variables sont réutilisés par référence. Pour le flux d'édition d'un programme, qui ne
	 * touche à rien d'autre : évite de cloner en profondeur tout le reste du projet à chaque
	 * commande. `copy()` reste requis pour les mutations qui touchent au projet lui-même.
	 */
	copyWithProgram(program: Program): Project {
		const newProject = Project.rehydrate(this);
		newProject.programs = { ...this.programs, [program.id]: program };
		return newProject;
	}

	static createFromJSON(json: string): Project {
		const jsonParsed = JSON.parse(json);
		const project = Project.rehydrate(jsonParsed);
		project.schemaVersion = jsonParsed.schemaVersion ?? PROJECT_SCHEMA_VERSION;
		project.creationDate = new Date(jsonParsed.creationDate);
		//Les projets antérieurs au dialecte configurable ont tous été écrits en français
		project.dialect = jsonParsed.dialect ?? Dialect.FR;
		project.lastModificationDate = new Date(jsonParsed.lastModificationDate);
		project.variables = (jsonParsed.variables || []).map((v: any) =>
			Variable.createFromJSON(JSON.stringify(v)),
		);
		const programs: Record<string, Program> = {};
		for (const programId in jsonParsed.programs) {
			const raw = jsonParsed.programs[programId];
			if (raw?.type === "grafcet") {
				programs[programId] = Grafcet.createFromJSON(JSON.stringify(raw));
			} else if (raw?.type === "ladder") {
				programs[programId] = Ladder.createFromJSON(JSON.stringify(raw));
			} else {
				console.error(`Programme de type inconnu ignoré : ${raw?.type}`);
			}
		}
		project.programs = programs;
		const hmiPages: Record<string, HmiPage> = {};
		for (const hmiPageId in jsonParsed.hmiPages ?? {}) {
			hmiPages[hmiPageId] = HmiPage.createFromJSON(
				JSON.stringify(jsonParsed.hmiPages[hmiPageId]),
			);
		}
		project.hmiPages = hmiPages;
		return project;
	}
}
