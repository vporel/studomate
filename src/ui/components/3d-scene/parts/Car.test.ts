import { Group, Mesh, type MeshStandardMaterial } from "three";
import { paintCar } from "./Car";

function car() {
	const root = new Group();
	const body = new Mesh();
	body.name = "car-paint";
	const roof = new Mesh();
	roof.name = "car-paint";
	const glass = new Mesh();
	const inner = new Group();
	inner.add(body, roof, glass);
	root.add(inner);
	return { root, body, roof, glass };
}

const colorOf = (mesh: Mesh) =>
	(mesh.material as MeshStandardMaterial).color.getHexString();

describe("paintCar", () => {
	it("paints the body and the roof, nested in the car, with the same paint", () => {
		const { root, body, roof, glass } = car();
		const glassMaterial = glass.material;
		paintCar(root, 1);
		expect(colorOf(body)).toBe("1e88e5");
		expect(roof.material).toBe(body.material);
		expect(glass.material).toBe(glassMaterial);
	});

	it("cycles through the paints by id", () => {
		const { root, body } = car();
		paintCar(root, 0);
		const first = body.material;
		paintCar(root, 6);
		expect(body.material).toBe(first);
		paintCar(root, 7);
		expect(body.material).not.toBe(first);
	});
});
