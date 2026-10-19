import {
	CAR_LENGTH,
	CAR_WIDTH,
	carPosition,
	LANE_KEYS,
	LANES,
	type Car as SimulatedCar,
	type LaneKey,
} from "@/3d-scenes/crossroads/v1/crossroads.model";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import Car, { paintCar } from "@/ui/components/3d-scene/parts/Car";
import { S } from "./crossroads-scale";

/** Cars that can be on one lane at once. */
const CAR_POOL_SIZE = 12;
/** Cars of the four lanes; `read` gives their positions for the current frame. */
export default function CrossroadsCars({
	read,
}: {
	read: () => Record<LaneKey, SimulatedCar[]> | null;
}) {
	const cars = useRef<Record<LaneKey, (Group | null)[]>>({
		NS1: [],
		NS2: [],
		EO1: [],
		EO2: [],
	});

	useFrame(() => {
		const lanes = read();
		if (!lanes) return;
		for (const lane of LANE_KEYS) {
			cars.current[lane].forEach((group, index) => {
				if (!group) return;
				const car = lanes[lane][index];
				group.visible = !!car;
				if (!car) return;
				const { x, z } = carPosition(lane, car.s);
				group.position.set(x * S, 0.05, z * S);
				paintCar(group, car.id);
			});
		}
	});

	return (
		<>
			{LANE_KEYS.map((lane) =>
				Array.from({ length: CAR_POOL_SIZE }, (_, index) => (
					<group
						key={`${lane}-${index}`}
						visible={false}
						rotation={[0, LANES[lane].heading, 0]}
						ref={(group) => {
							cars.current[lane][index] = group;
						}}
					>
						<Car width={CAR_WIDTH * S} length={CAR_LENGTH * S} />
					</group>
				)),
			)}
		</>
	);
}
