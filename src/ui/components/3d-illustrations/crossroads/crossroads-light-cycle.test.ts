import CrossroadsModel, {
	type CrossroadsState,
} from "@/3d-scenes/crossroads/v1/crossroads.model";
import { LIGHT_CYCLE_MS, lightCycleAt } from "./crossroads-light-cycle";

const STEP_MS = 20;

const lit = (tMs: number, lane: string) => {
	const values = lightCycleAt(tMs);
	return (["red", "orange", "green"] as const).filter(
		(colour) => values[`${colour}${lane}`],
	);
};

describe("lightCycleAt", () => {
	it("allume exactement une couleur par feu, la même pour les deux feux d'un axe", () => {
		for (let t = 0; t < LIGHT_CYCLE_MS; t += 250) {
			for (const lane of ["NS1", "NS2", "EO1", "EO2"]) {
				expect(lit(t, lane)).toHaveLength(1);
			}
			expect(lit(t, "NS1")).toEqual(lit(t, "NS2"));
			expect(lit(t, "EO1")).toEqual(lit(t, "EO2"));
		}
	});

	it("ne laisse jamais les deux axes hors du rouge en même temps", () => {
		for (let t = 0; t < LIGHT_CYCLE_MS; t += 50) {
			expect(lit(t, "NS1")[0] === "red" || lit(t, "EO1")[0] === "red").toBe(
				true,
			);
		}
	});

	it("passe chaque axe au vert puis à l'orange, et boucle", () => {
		const colours = (lane: string) =>
			new Set(
				Array.from(
					{ length: LIGHT_CYCLE_MS / 250 },
					(_, i) => lit(i * 250, lane)[0],
				),
			);
		expect(colours("NS1")).toEqual(new Set(["green", "orange", "red"]));
		expect(colours("EO1")).toEqual(new Set(["green", "orange", "red"]));
		expect(lightCycleAt(LIGHT_CYCLE_MS + 1234)).toEqual(lightCycleAt(1234));
	});

	it("fait circuler les voitures du modèle sur plusieurs cycles sans aucune collision", () => {
		let state: CrossroadsState = CrossroadsModel.createState();
		let carsOut = 0;
		for (let t = 0; t < 4 * LIGHT_CYCLE_MS; t += STEP_MS) {
			const before = state.nextCarId - 1;
			const onRoad = (s: CrossroadsState) =>
				Object.values(s.lanes).reduce((n, cars) => n + cars.length, 0);
			const previousOnRoad = onRoad(state);
			state = CrossroadsModel.step(state, STEP_MS, lightCycleAt(t));
			carsOut +=
				previousOnRoad + (state.nextCarId - 1 - before) - onRoad(state);
		}
		expect(state.accidents).toBe(0);
		expect(carsOut).toBeGreaterThan(10);
	});
});
