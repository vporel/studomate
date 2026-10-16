import {
	ENTRY_Z,
	FADE,
	HIGH_Z,
	LOOP_DURATION,
	LOW_Z,
	P1_STROKE,
	SIDE_STROKE,
	STATION_X,
	sampleHeroScene,
} from "./hero-timeline";

/** Samples the loop finely and returns the first time `predicate` holds. */
const firstTime = (predicate: (t: number) => boolean, from = 0) => {
	for (let t = from; t < LOOP_DURATION; t += 0.01) if (predicate(t)) return t;
	throw new Error("never reached");
};

describe("sampleHeroScene", () => {
	it("démarre à vide, une caisse basse apparaissant sur T1 en marche", () => {
		const start = sampleHeroScene(0);
		expect(start.cartons).toHaveLength(1);
		expect(start.cartons[0]).toMatchObject({ tall: false, scale: 0 });
		expect(start.t1Running).toBe(true);
	});

	it("amène la caisse au poste, puis P1 la pousse dans le couloir et rentre", () => {
		const atStation = firstTime(
			(t) => sampleHeroScene(t).cartons[0].x >= STATION_X,
		);
		const pushed = firstTime(
			(t) => sampleHeroScene(t).cartons[0].z >= ENTRY_Z,
			atStation,
		);
		const midPush = sampleHeroScene((atStation + pushed) / 2);

		expect(midPush.t1Running).toBe(false);
		expect(midPush.p1).toBeGreaterThan(0);
		expect(midPush.p1).toBeLessThanOrEqual(P1_STROKE);
		const retracting = firstTime(
			(t) => sampleHeroScene(t).p1 < P1_STROKE / 2,
			pushed,
		);
		expect(sampleHeroScene(retracting).cartons[0].z).toBe(ENTRY_Z);
	});

	it("trie la caisse basse vers la sortie basse avec P2, la haute vers la sortie haute avec P3", () => {
		const lowSorted = firstTime(
			(t) => sampleHeroScene(t).cartons[0].x >= STATION_X + SIDE_STROKE,
		);
		const lowState = sampleHeroScene(lowSorted);
		expect(lowState.cartons[0].z).toBeCloseTo(LOW_Z);
		expect(lowState.p2).toBeCloseTo(SIDE_STROKE, 1);
		expect(lowState.p3).toBe(0);

		const tallSorted = firstTime((t) => {
			const tall = sampleHeroScene(t).cartons[1];
			return !!tall && tall.x >= STATION_X + SIDE_STROKE;
		});
		const tallState = sampleHeroScene(tallSorted);
		expect(tallState.cartons[1]).toMatchObject({ tall: true });
		expect(tallState.cartons[1].z).toBeCloseTo(HIGH_Z);
		expect(tallState.p3).toBeCloseTo(SIDE_STROKE, 1);
		expect(tallState.p2).toBe(0);
	});

	it("ne fait tourner T2 que pendant le trajet de la caisse dans le couloir", () => {
		const running = firstTime((t) => sampleHeroScene(t).t2Running);
		const state = sampleHeroScene(running + 0.05);

		expect(state.cartons[0].x).toBe(STATION_X);
		expect(state.cartons[0].z).toBeGreaterThan(ENTRY_Z);
		expect(state.cartons[0].z).toBeLessThan(LOW_Z);
	});

	it("laisse la caisse basse sur sa sortie pendant le traitement de la haute", () => {
		const tallAppears = firstTime((t) => sampleHeroScene(t).cartons.length > 1);
		const low = sampleHeroScene(tallAppears + 1).cartons[0];

		expect(low.x).toBeCloseTo(STATION_X + SIDE_STROKE);
		expect(low.z).toBeCloseTo(LOW_Z);
		expect(low.scale).toBe(1);
	});

	it("fait disparaître les caisses triées en fin de boucle puis recommence au début", () => {
		const fading = sampleHeroScene(LOOP_DURATION - FADE / 2);
		expect(fading.cartons).toHaveLength(2);
		for (const carton of fading.cartons) expect(carton.scale).toBeCloseTo(0.5);
		expect(fading.t1Running || fading.t2Running).toBe(false);
		expect(fading.p1 + fading.p2 + fading.p3).toBe(0);

		expect(sampleHeroScene(LOOP_DURATION + 1)).toEqual(sampleHeroScene(1));
	});
});
