import Project from "@/schemas/project/project.schema";
import { ProjectMode } from "../ProjectMode.enum";
import { ProjectStoreState } from "../project.store";
import VariablesManager from "./variables.manager";

/**
 * Ces tests tournent sans zustand ni React : le manager ne reçoit qu'un `get`/`set`.
 */
function makeManager(initial: {
	project?: Project | null;
	mode?: ProjectMode;
}) {
	let state = {
		project: initial.project ?? null,
		mode: initial.mode ?? ProjectMode.DESIGN,
		commandsStackManager: { executeOperation: jest.fn() },
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	return { manager: new VariablesManager(set, get), getState: () => state };
}

function projectWithVariables() {
	const project = new Project("p1", "Projet", "auteur");
	project.variables = [
		{ id: "v1", mnemonic: "Moteur", type: "BOOL" } as any,
		{ id: "v2", mnemonic: "moteur", type: "BOOL" } as any, // même mot, casse différente : doit rester distinct
	];
	return project;
}

describe("VariablesManager", () => {
	describe("existsByMnemonic", () => {
		it("retourne l'id de la variable dont le mnémonique correspond exactement", () => {
			const { manager } = makeManager({ project: projectWithVariables() });

			expect(manager.existsByMnemonic("Moteur")).toBe("v1");
			expect(manager.existsByMnemonic("moteur")).toBe("v2");
		});

		// Deux variables peuvent ne différer que par la casse (ex: API externe) — la comparaison
		// doit donc rester sensible à la casse, pas de repli insensible.
		it("ne trouve pas une variable si seule la casse diffère", () => {
			const project = new Project("p1", "Projet", "auteur");
			project.variables = [
				{ id: "v1", mnemonic: "Moteur", type: "BOOL" } as any,
			];
			const { manager } = makeManager({ project });

			expect(manager.existsByMnemonic("MOTEUR")).toBe(false);
			expect(manager.existsByMnemonic("moteur")).toBe(false);
		});

		it("retourne false si aucun projet n'est ouvert", () => {
			const { manager } = makeManager({ project: null });

			expect(manager.existsByMnemonic("Moteur")).toBe(false);
		});

		it("retourne false si aucune variable ne correspond", () => {
			const { manager } = makeManager({ project: projectWithVariables() });

			expect(manager.existsByMnemonic("Inconnue")).toBe(false);
		});
	});

	describe("existsByAddress", () => {
		it("retourne l'id de la variable dont l'adresse correspond, insensible à la casse", () => {
			const project = new Project("p1", "Projet", "auteur");
			project.variables = [
				{ id: "v1", mnemonic: "Moteur", type: "BOOL", address: "%Q0.0" } as any,
			];
			const { manager } = makeManager({ project });

			expect(manager.existsByAddress("%q0.0")).toBe("v1");
		});

		it("retourne false pour une adresse vide", () => {
			const { manager } = makeManager({ project: projectWithVariables() });

			expect(manager.existsByAddress("")).toBe(false);
			expect(manager.existsByAddress("   ")).toBe(false);
		});

		it("retourne false si aucun projet n'est ouvert", () => {
			const { manager } = makeManager({ project: null });

			expect(manager.existsByAddress("%Q0.0")).toBe(false);
		});
	});

	describe("index mnémonique/adresse", () => {
		it("se reconstruit quand l'identité du projet change", () => {
			const first = projectWithVariables();
			const { manager, getState } = makeManager({ project: first });

			expect(manager.existsByMnemonic("Moteur")).toBe("v1");

			const next = new Project("p1", "Projet", "auteur");
			next.variables = [{ id: "v9", mnemonic: "Pompe", type: "BOOL" } as any];
			(getState() as any).project = next;

			expect(manager.existsByMnemonic("Moteur")).toBe(false);
			expect(manager.existsByMnemonic("Pompe")).toBe("v9");
		});
	});

	describe("addVariables / updateVariable / removeVariables", () => {
		it("ne fait rien si aucun projet n'est ouvert", () => {
			const { manager, getState } = makeManager({ project: null });

			manager.addVariables([
				{ mnemonic: "X", zone: "memory", type: "BOOL" } as any,
			]);

			expect(
				getState().commandsStackManager.executeOperation,
			).not.toHaveBeenCalled();
		});

		it("refuse d'ajouter une variable hors mode DESIGN", () => {
			const { manager, getState } = makeManager({
				project: projectWithVariables(),
				mode: ProjectMode.SIMULATION,
			});

			manager.addVariables([
				{ mnemonic: "X", zone: "memory", type: "BOOL" } as any,
			]);

			expect(
				getState().commandsStackManager.executeOperation,
			).not.toHaveBeenCalled();
		});

		it("dispatche une commande d'ajout en mode DESIGN", () => {
			const { manager, getState } = makeManager({
				project: projectWithVariables(),
			});

			manager.addVariables([
				{ mnemonic: "Capteur", zone: "logic-input", type: "BOOL" } as any,
			]);

			expect(
				getState().commandsStackManager.executeOperation,
			).toHaveBeenCalledTimes(1);
		});

		it("refuse de modifier une variable hors mode DESIGN", () => {
			const { manager, getState } = makeManager({
				project: projectWithVariables(),
				mode: ProjectMode.SIMULATION,
			});

			manager.updateVariable("v1", { mnemonic: "Autre" });

			expect(
				getState().commandsStackManager.executeOperation,
			).not.toHaveBeenCalled();
		});

		it("refuse de supprimer des variables hors mode DESIGN", () => {
			const { manager, getState } = makeManager({
				project: projectWithVariables(),
				mode: ProjectMode.SIMULATION,
			});

			manager.removeVariables(["v1"]);

			expect(
				getState().commandsStackManager.executeOperation,
			).not.toHaveBeenCalled();
		});

		it("dispatche une commande de suppression en mode DESIGN", () => {
			const { manager, getState } = makeManager({
				project: projectWithVariables(),
			});

			manager.removeVariables(["v1"]);

			expect(
				getState().commandsStackManager.executeOperation,
			).toHaveBeenCalledTimes(1);
		});
	});
});
