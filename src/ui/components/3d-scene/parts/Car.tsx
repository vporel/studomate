"use client";

import { type Group, type Mesh, MeshStandardMaterial } from "three";

const PAINT_COLORS = [
	"#e53935",
	"#1e88e5",
	"#fdd835",
	"#43a047",
	"#8e24aa",
	"#f5f5f5",
];
const PAINTED = "car-paint";

const paints = PAINT_COLORS.map(
	(color) => new MeshStandardMaterial({ color, roughness: 0.4 }),
);
const glass = new MeshStandardMaterial({ color: "#263238", roughness: 0.2 });
const tyre = new MeshStandardMaterial({ color: "#1b1b1b", roughness: 0.9 });
const headlight = new MeshStandardMaterial({
	color: "#fff8e1",
	emissive: "#fff8e1",
	emissiveIntensity: 0.4,
});
const taillight = new MeshStandardMaterial({
	color: "#c62828",
	emissive: "#c62828",
	emissiveIntensity: 0.4,
});

const WHEEL_RADIUS = 0.045;
const WHEEL_THICKNESS = 0.03;
const BODY_BOTTOM = 0.035;
const BODY_HEIGHT = 0.085;
const CABIN_HEIGHT = 0.07;
const ROOF_THICKNESS = 0.012;

/** Gives the car its paint from the pool, picked by `id`. */
export function paintCar(car: Group, id: number) {
	const paint = paints[id % paints.length];
	car.traverse((object) => {
		if (object.name === PAINTED) (object as Mesh).material = paint;
	});
}

/**
 * Small car fitting a `width` × `length` footprint (world units), standing on y = 0 and facing +z.
 */
export default function Car({
	width,
	length,
}: {
	width: number;
	length: number;
}) {
	const bodyTop = BODY_BOTTOM + BODY_HEIGHT;
	const cabinLength = length * 0.5;
	const cabinZ = -length * 0.06;
	const wheelX = width / 2 - WHEEL_THICKNESS / 2;
	const wheelZ = length / 2 - length * 0.2;
	const lightX = width * 0.3;
	const lightY = BODY_BOTTOM + BODY_HEIGHT * 0.6;

	return (
		<group>
			<mesh
				name={PAINTED}
				material={paints[0]}
				position={[0, BODY_BOTTOM + BODY_HEIGHT / 2, 0]}
			>
				<boxGeometry args={[width, BODY_HEIGHT, length]} />
			</mesh>
			<mesh material={glass} position={[0, bodyTop + CABIN_HEIGHT / 2, cabinZ]}>
				<boxGeometry args={[width * 0.84, CABIN_HEIGHT, cabinLength]} />
			</mesh>
			<mesh
				name={PAINTED}
				material={paints[0]}
				position={[0, bodyTop + CABIN_HEIGHT + ROOF_THICKNESS / 2, cabinZ]}
			>
				<boxGeometry
					args={[width * 0.86, ROOF_THICKNESS, cabinLength * 0.92]}
				/>
			</mesh>
			{[-1, 1].flatMap((side) =>
				[-1, 1].map((end) => (
					<mesh
						key={`${side}${end}`}
						material={tyre}
						position={[side * wheelX, WHEEL_RADIUS, end * wheelZ]}
						rotation={[0, 0, Math.PI / 2]}
					>
						<cylinderGeometry
							args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_THICKNESS, 16]}
						/>
					</mesh>
				)),
			)}
			{[-1, 1].map((side) => (
				<group key={side}>
					<mesh
						material={headlight}
						position={[side * lightX, lightY, length / 2]}
					>
						<boxGeometry args={[width * 0.2, 0.02, 0.006]} />
					</mesh>
					<mesh
						material={taillight}
						position={[side * lightX, lightY, -length / 2]}
					>
						<boxGeometry args={[width * 0.2, 0.02, 0.006]} />
					</mesh>
				</group>
			))}
		</group>
	);
}
