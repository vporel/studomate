import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import JunctionAndEnd from "@/schemas/grafcet/junction-and-end.schema";
import JunctionAndStart from "@/schemas/grafcet/junction-and-start.schema";



/**
 * Topologies de jonction ET partagées entre `junction-and-start.analyser.test.ts` et
 * `junction-and-end.analyser.test.ts` : les deux analyseurs vérifient des invariants
 * symétriques (divergence ↔ convergence), donc les mêmes topologies — juste analysées côté
 * pivot opposé — servent aux deux suites.
 */

/** Divergence ET complète et fermée par une convergence : aucune issue attendue des deux côtés. */
export function buildValidAndTopology() {
	const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
	const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
	const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
	const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
	const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
	const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
	const connections = [
		new ConnectionBuilder()
			.id("c0")
			.source("transition", "trans-in", "source:successor")
			.target("junction-and-start", "jas-1", "pivot")
			.build(),
		new ConnectionBuilder()
			.id("c1")
			.source("junction-and-start", "jas-1", jasBranch1)
			.target("step", "step-1", "target:predecessor")
			.build(),
		new ConnectionBuilder()
			.id("c2")
			.source("junction-and-start", "jas-1", jasBranch2)
			.target("step", "step-2", "target:predecessor")
			.build(),
		new ConnectionBuilder()
			.id("c3")
			.source("step", "step-1", "source:successor")
			.target("junction-and-end", "jae-1", jaeBranch1)
			.build(),
		new ConnectionBuilder()
			.id("c4")
			.source("step", "step-2", "source:successor")
			.target("junction-and-end", "jae-1", jaeBranch2)
			.build(),
		new ConnectionBuilder()
			.id("c5")
			.source("junction-and-end", "jae-1", "pivot")
			.target("transition", "trans-out", "target:predecessor")
			.build(),
	];
	const grafcet = new GrafcetBuilder()
		.id("grafcet-1")
		.addSteps(step1, step2)
		.addJunctionAndStart(jas)
		.addJunctionAndEnd(jae)
		.addConnections(...connections)
		.build();
	return { jas, jae, grafcet };
}

/**
 * Divergence ET fermée par une convergence ET, dont une branche contient elle-même une
 * divergence/convergence ET imbriquée avant de rejoindre la convergence externe — parallélisme
 * imbriqué, structure normée. Aucune issue attendue des deux côtés.
 */
export function buildValidNestedAndTopology() {
	const jasOuter = new JunctionAndStartBuilder().id("jas-outer").nBranches(2).build();
	const jaeOuter = new JunctionAndEndBuilder().id("jae-outer").nBranches(2).build();
	const jasInner = new JunctionAndStartBuilder().id("jas-inner").nBranches(2).build();
	const jaeInner = new JunctionAndEndBuilder().id("jae-inner").nBranches(2).build();
	const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
	const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
	const step3 = new StepBuilder().id("step-3").number(3).position(0, 0).build();
	const [outerBranch1, outerBranch2] = jasOuter.data.branchesOrder;
	const [outerJaeBranch1, outerJaeBranch2] = jaeOuter.data.branchesOrder;
	const [innerBranch1, innerBranch2] = jasInner.data.branchesOrder;
	const [innerJaeBranch1, innerJaeBranch2] = jaeInner.data.branchesOrder;
	const connections = [
		new ConnectionBuilder().id("c0").source("transition", "t-in", "source:successor").target("junction-and-start", "jas-outer", "pivot").build(),
		new ConnectionBuilder().id("c1").source("junction-and-start", "jas-outer", outerBranch1).target("step", "step-1", "target:predecessor").build(),
		new ConnectionBuilder().id("c2").source("junction-and-start", "jas-outer", outerBranch2).target("junction-and-start", "jas-inner", "pivot").build(),
		new ConnectionBuilder().id("c3").source("junction-and-start", "jas-inner", innerBranch1).target("step", "step-2", "target:predecessor").build(),
		new ConnectionBuilder().id("c4").source("junction-and-start", "jas-inner", innerBranch2).target("step", "step-3", "target:predecessor").build(),
		new ConnectionBuilder().id("c5").source("step", "step-2", "source:successor").target("junction-and-end", "jae-inner", innerJaeBranch1).build(),
		new ConnectionBuilder().id("c6").source("step", "step-3", "source:successor").target("junction-and-end", "jae-inner", innerJaeBranch2).build(),
		new ConnectionBuilder().id("c7").source("junction-and-end", "jae-inner", "pivot").target("junction-and-end", "jae-outer", outerJaeBranch2).build(),
		new ConnectionBuilder().id("c8").source("step", "step-1", "source:successor").target("junction-and-end", "jae-outer", outerJaeBranch1).build(),
		new ConnectionBuilder().id("c9").source("junction-and-end", "jae-outer", "pivot").target("transition", "t-out", "target:predecessor").build(),
	];
	const grafcet = new GrafcetBuilder()
		.id("grafcet-1")
		.addSteps(step1, step2, step3)
		.addJunctionsAndStarts(jasOuter, jasInner)
		.addJunctionsAndEnds(jaeOuter, jaeInner)
		.addConnections(...connections)
		.build();
	return { jasOuter, jaeOuter, jasInner, jaeInner, grafcet };
}

/**
 * Divergence ET (JAS) dont les branches mènent à des étapes sans jonction de fermeture
 * atteignable, ou convergence ET (JAE) dont les branches viennent d'étapes sans jonction
 * d'ouverture en amont — selon `direction`.
 */
export function buildAndTopologyWithNoOppositeJunction(direction: "start"): { junction: JunctionAndStart; grafcet: Grafcet };
export function buildAndTopologyWithNoOppositeJunction(direction: "end"): { junction: JunctionAndEnd; grafcet: Grafcet };
export function buildAndTopologyWithNoOppositeJunction(
	direction: "start" | "end",
): { junction: JunctionAndStart | JunctionAndEnd; grafcet: Grafcet } {
	const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
	const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();

	if (direction === "start") {
		const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
		const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
		const connections = [
			new ConnectionBuilder()
				.id("c0")
				.source("transition", "trans-1", "source:successor")
				.target("junction-and-start", "jas-1", "pivot")
				.build(),
			new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "jas-1", jasBranch1)
				.target("step", "step-1", "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id("c2")
				.source("junction-and-start", "jas-1", jasBranch2)
				.target("step", "step-2", "target:predecessor")
				.build(),
		];
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.addSteps(step1, step2)
			.addJunctionAndStart(jas)
			.addConnections(...connections)
			.build();
		return { junction: jas, grafcet };
	}

	const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
	const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
	const connections = [
		new ConnectionBuilder()
			.id("c1")
			.source("step", "step-1", "source:successor")
			.target("junction-and-end", "jae-1", jaeBranch1)
			.build(),
		new ConnectionBuilder()
			.id("c2")
			.source("step", "step-2", "source:successor")
			.target("junction-and-end", "jae-1", jaeBranch2)
			.build(),
		new ConnectionBuilder()
			.id("c3")
			.source("junction-and-end", "jae-1", "pivot")
			.target("transition", "trans-1", "target:predecessor")
			.build(),
	];
	const grafcet = new GrafcetBuilder()
		.id("grafcet-1")
		.addSteps(step1, step2)
		.addJunctionAndEnd(jae)
		.addConnections(...connections)
		.build();
	return { junction: jae, grafcet };
}

/**
 * Deux branches d'une divergence ET (JAS) qui rejoignent deux JAE distinctes, ou deux branches
 * d'une convergence ET (JAE) qui viennent de deux JAS distinctes — selon `direction`.
 */
export function buildAndTopologyWithMismatchedOppositeJunctions(direction: "start"): { junction: JunctionAndStart; grafcet: Grafcet };
export function buildAndTopologyWithMismatchedOppositeJunctions(direction: "end"): { junction: JunctionAndEnd; grafcet: Grafcet };
export function buildAndTopologyWithMismatchedOppositeJunctions(
	direction: "start" | "end",
): { junction: JunctionAndStart | JunctionAndEnd; grafcet: Grafcet } {
	const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
	const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();

	if (direction === "start") {
		const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
		const jae1 = new JunctionAndEndBuilder().id("jae-1").nBranches(1).build();
		const jae2 = new JunctionAndEndBuilder().id("jae-2").nBranches(1).build();
		const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
		const [jae1Branch] = jae1.data.branchesOrder;
		const [jae2Branch] = jae2.data.branchesOrder;
		const connections = [
			new ConnectionBuilder().id("c0").source("transition", "t0", "source:successor").target("junction-and-start", "jas-1", "pivot").build(),
			new ConnectionBuilder().id("c1").source("junction-and-start", "jas-1", jasBranch1).target("step", "step-1", "target:predecessor").build(),
			new ConnectionBuilder().id("c2").source("junction-and-start", "jas-1", jasBranch2).target("step", "step-2", "target:predecessor").build(),
			new ConnectionBuilder().id("c3").source("step", "step-1", "source:successor").target("junction-and-end", "jae-1", jae1Branch).build(),
			new ConnectionBuilder().id("c4").source("step", "step-2", "source:successor").target("junction-and-end", "jae-2", jae2Branch).build(),
		];
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.addSteps(step1, step2)
			.addJunctionAndStart(jas)
			.addJunctionsAndEnds(jae1, jae2)
			.addConnections(...connections)
			.build();
		return { junction: jas, grafcet };
	}

	const jas1 = new JunctionAndStartBuilder().id("jas-1").nBranches(1).build();
	const jas2 = new JunctionAndStartBuilder().id("jas-2").nBranches(1).build();
	const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
	const [jas1Branch] = jas1.data.branchesOrder;
	const [jas2Branch] = jas2.data.branchesOrder;
	const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
	const connections = [
		new ConnectionBuilder().id("c0").source("transition", "t0", "source:successor").target("junction-and-start", "jas-1", "pivot").build(),
		new ConnectionBuilder().id("c1").source("junction-and-start", "jas-1", jas1Branch).target("step", "step-1", "target:predecessor").build(),
		new ConnectionBuilder().id("c2").source("transition", "t1", "source:successor").target("junction-and-start", "jas-2", "pivot").build(),
		new ConnectionBuilder().id("c3").source("junction-and-start", "jas-2", jas2Branch).target("step", "step-2", "target:predecessor").build(),
		new ConnectionBuilder().id("c4").source("step", "step-1", "source:successor").target("junction-and-end", "jae-1", jaeBranch1).build(),
		new ConnectionBuilder().id("c5").source("step", "step-2", "source:successor").target("junction-and-end", "jae-1", jaeBranch2).build(),
		new ConnectionBuilder().id("c6").source("junction-and-end", "jae-1", "pivot").target("transition", "t-out", "target:predecessor").build(),
	];
	const grafcet = new GrafcetBuilder()
		.id("grafcet-1")
		.addSteps(step1, step2)
		.addJunctionsAndStarts(jas1, jas2)
		.addJunctionAndEnd(jae)
		.addConnections(...connections)
		.build();
	return { junction: jae, grafcet };
}

/**
 * Une JAS à 2 branches fermée par une JAE à 1 branche (ou l'inverse) — selon `direction`,
 * le nombre de branches déclaré par la jonction analysée ne correspond pas à celui de son
 * opposée.
 */
export function buildAndTopologyWithMismatchedBranchCount(direction: "start"): { junction: JunctionAndStart; grafcet: Grafcet };
export function buildAndTopologyWithMismatchedBranchCount(direction: "end"): { junction: JunctionAndEnd; grafcet: Grafcet };
export function buildAndTopologyWithMismatchedBranchCount(
	direction: "start" | "end",
): { junction: JunctionAndStart | JunctionAndEnd; grafcet: Grafcet } {
	const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
	const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();

	if (direction === "start") {
		const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
		const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(1).build();
		const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
		const [jaeBranch1] = jae.data.branchesOrder;
		const connections = [
			new ConnectionBuilder().id("c0").source("transition", "t0", "source:successor").target("junction-and-start", "jas-1", "pivot").build(),
			new ConnectionBuilder().id("c1").source("junction-and-start", "jas-1", jasBranch1).target("step", "step-1", "target:predecessor").build(),
			new ConnectionBuilder().id("c2").source("junction-and-start", "jas-1", jasBranch2).target("step", "step-2", "target:predecessor").build(),
			new ConnectionBuilder().id("c3").source("step", "step-1", "source:successor").target("junction-and-end", "jae-1", jaeBranch1).build(),
			new ConnectionBuilder().id("c4").source("step", "step-2", "source:successor").target("junction-and-end", "jae-1", jaeBranch1).build(),
		];
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.addSteps(step1, step2)
			.addJunctionAndStart(jas)
			.addJunctionAndEnd(jae)
			.addConnections(...connections)
			.build();
		return { junction: jas, grafcet };
	}

	const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(1).build();
	const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
	const detour = new TransitionBuilder().id("t-detour").expression("VRAI").build();
	const [jasBranch1] = jas.data.branchesOrder;
	const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
	const connections = [
		new ConnectionBuilder().id("c0").source("transition", "t0", "source:successor").target("junction-and-start", "jas-1", "pivot").build(),
		new ConnectionBuilder().id("c1").source("junction-and-start", "jas-1", jasBranch1).target("step", "step-1", "target:predecessor").build(),
		new ConnectionBuilder().id("c2a").source("step", "step-1", "source:successor").target("transition", "t-detour", "target:predecessor").build(),
		new ConnectionBuilder().id("c2b").source("transition", "t-detour", "source:successor").target("step", "step-2", "target:predecessor").build(),
		new ConnectionBuilder().id("c3").source("step", "step-1", "source:successor").target("junction-and-end", "jae-1", jaeBranch1).build(),
		new ConnectionBuilder().id("c4").source("step", "step-2", "source:successor").target("junction-and-end", "jae-1", jaeBranch2).build(),
		new ConnectionBuilder().id("c5").source("junction-and-end", "jae-1", "pivot").target("transition", "t-out", "target:predecessor").build(),
	];
	const grafcet = new GrafcetBuilder()
		.id("grafcet-1")
		.addSteps(step1, step2)
		.addJunctionAndStart(jas)
		.addJunctionAndEnd(jae)
		.addTransition(detour)
		.addConnections(...connections)
		.build();
	return { junction: jae, grafcet };
}
