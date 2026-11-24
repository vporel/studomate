import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "./project.schema";

describe("Project — programme Main", () => {
	it("crée automatiquement un Main à la création du projet", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.main).toBeInstanceOf(Ladder);
		expect(project.main.role).toBe("main");
	});

	it("createMain refuse d'en créer un second", () => {
		const project = new Project("p1", "Projet", "");

		expect(() => project.createMain()).toThrow();
	});

	it("deleteProgram refuse de supprimer le Main", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		project.deleteProgram(mainId);

		expect(project.getProgram(mainId)).toBeDefined();
	});

	it("deleteProgram supprime bien un ladder standard", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Mon ladder");

		project.deleteProgram(ladder.id);

		expect(project.getProgram(ladder.id)).toBeUndefined();
	});

	it("deleteProgram ignore un identifiant inconnu et laisse le Main en place", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		expect(() => project.deleteProgram("inconnu")).not.toThrow();

		expect(project.getProgram(mainId)).toBeDefined();
	});

	it("le Main apparaît dans project.ladders au même titre qu'un ladder standard", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.ladders[project.main.id]).toBe(project.main);
	});

	it("copy() préserve le Main du projet original", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		const copy = project.copy();

		expect(copy.main.id).toBe(mainId);
		expect(copy.main.role).toBe("main");
	});

	it("createFromJSON reconstruit le Main du projet", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		const restored = Project.createFromJSON(JSON.stringify(project));

		expect(restored.main.id).toBe(mainId);
		expect(restored.main.role).toBe("main");
	});
});

describe("Project — getLadderCallRefusal", () => {
	function setup() {
		const project = new Project("p1", "Projet", "");
		const caller = project.createLadder("Appelant");
		const other = project.createLadder("Autre");
		const excluded = project.createLadder("Exclu");
		excluded.excludedFromExecution = true;
		return { project, caller, other, excluded };
	}

	it("accepte un ladder exécuté", () => {
		const { project, caller, other } = setup();

		expect(project.getLadderCallRefusal(caller.id, other.id)).toBeUndefined();
	});

	it("refuse le Main", () => {
		const { project, caller } = setup();

		expect(project.getLadderCallRefusal(caller.id, project.main.id)).toBe(
			"main",
		);
	});

	it("refuse l'appelant lui-même", () => {
		const { project, caller } = setup();

		expect(project.getLadderCallRefusal(caller.id, caller.id)).toBe("self");
	});

	it("refuse un ladder exclu depuis un appelant exécuté", () => {
		const { project, caller, excluded } = setup();

		expect(project.getLadderCallRefusal(caller.id, excluded.id)).toBe(
			"excluded",
		);
	});

	it("accepte un ladder exclu depuis un appelant exclu", () => {
		const { project, caller, excluded } = setup();
		caller.excludedFromExecution = true;

		expect(
			project.getLadderCallRefusal(caller.id, excluded.id),
		).toBeUndefined();
	});

	it("refuse un programme qui n'est pas un ladder", () => {
		const { project, caller } = setup();
		const grafcet = project.createGrafcet("Cycle");

		expect(project.getLadderCallRefusal(caller.id, grafcet.id)).toBe(
			"not-a-ladder",
		);
		expect(project.getLadderCallRefusal(caller.id, "inconnu")).toBe(
			"not-a-ladder",
		);
	});
});

describe("Project — getLaddersCallableFrom", () => {
	it("exclut le Main, l'appelant et les ladders exclus de l'exécution", () => {
		const project = new Project("p1", "Projet", "");
		const caller = project.createLadder("Appelant");
		const callable = project.createLadder("Appelable");
		const excluded = project.createLadder("Exclu");
		excluded.excludedFromExecution = true;

		expect(project.getLaddersCallableFrom(caller.id)).toEqual([callable]);
	});

	it("est vide quand le Main est le seul ladder", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.getLaddersCallableFrom(project.main.id)).toEqual([]);
	});

	it("ignore les grafcets", () => {
		const project = new Project("p1", "Projet", "");
		project.createGrafcet("Cycle");

		expect(project.getLaddersCallableFrom(project.main.id)).toEqual([]);
	});

	it("propose les ladders exclus, avec les exécutés, depuis un appelant exclu", () => {
		const project = new Project("p1", "Projet", "");
		const caller = project.createLadder("Appelant");
		caller.excludedFromExecution = true;
		const executed = project.createLadder("Exécuté");
		const excluded = project.createLadder("Exclu");
		excluded.excludedFromExecution = true;

		expect(project.getLaddersCallableFrom(caller.id)).toEqual([
			executed,
			excluded,
		]);
	});

	it("n'inclut jamais le Main ni l'appelant, même depuis un appelant exclu", () => {
		const project = new Project("p1", "Projet", "");
		const caller = project.createLadder("Appelant");
		caller.excludedFromExecution = true;

		expect(project.getLaddersCallableFrom(caller.id)).toEqual([]);
	});

	it("propose les ladders standards au Main", () => {
		const project = new Project("p1", "Projet", "");
		const other = project.createLadder("Autre");

		expect(project.getLaddersCallableFrom(project.main.id)).toEqual([other]);
	});
});
