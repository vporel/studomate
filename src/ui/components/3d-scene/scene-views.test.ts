import { listSceneVersions, listScenes } from "@/3d-scenes/scene.registry";
import { getSceneViewDefinition } from "./scene-views";

jest.mock("./carton-sorting/v1/CartonSortingScene", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./carton-sorting/v1/CartonSortingControls", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./crossroads/v1/CrossroadsScene", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./drilling/v1/DrillingScene", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./drilling/v1/DrillingControls", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./elevator/v1/ElevatorScene", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./elevator/v1/ElevatorControls", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./parking/v1/ParkingScene", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./parking/v1/ParkingControls", () => ({
	__esModule: true,
	default: () => null,
}));

const REGISTERED = listScenes().flatMap(({ id }) =>
	listSceneVersions(id).map((version) => [id, version] as const),
);

describe("getSceneViewDefinition", () => {
	it("covers at least one scene", () => {
		expect(REGISTERED.length).toBeGreaterThan(0);
	});

	it.each(REGISTERED)(
		"has a view with a component and an interpolation for %s v%i",
		(id, version) => {
			const view = getSceneViewDefinition(id, version);
			expect(view).toBeDefined();
			expect(typeof view!.Component).toBe("function");
			expect(typeof view!.interpolate).toBe("function");
		},
	);

	it("returns undefined for an unknown scene or version", () => {
		expect(getSceneViewDefinition("nope", 1)).toBeUndefined();
		const [id, version] = REGISTERED[0];
		expect(getSceneViewDefinition(id, version + 100)).toBeUndefined();
	});
});
