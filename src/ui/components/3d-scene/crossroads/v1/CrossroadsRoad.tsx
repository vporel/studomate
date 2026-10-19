import {
	carPosition,
	HALF_CROSSING,
	LANE_KEYS,
	LANES,
	ROAD_HALF,
	STOP_LINE,
} from "@/3d-scenes/crossroads/v1/crossroads.model";
import Box from "@/ui/components/3d-scene/parts/Box";
import { S } from "./crossroads-scale";

const ROAD_WIDTH = 2 * HALF_CROSSING * S;
const ROAD_LENGTH = 2 * ROAD_HALF * S;
const ROAD_COLOR = "#455a64";
const DASH_COUNT = 12;

/** The two crossing roads with their centre dashes and stop lines, centred on the crossing. */
export default function CrossroadsRoad() {
	return (
		<>
			<Box
				position={[0, 0, 0]}
				size={[ROAD_WIDTH, 0.1, ROAD_LENGTH]}
				color={ROAD_COLOR}
			/>
			<Box
				position={[0, 0, 0]}
				size={[ROAD_LENGTH, 0.1, ROAD_WIDTH]}
				color={ROAD_COLOR}
			/>
			<Box
				position={[0, 0.051, 0]}
				size={[ROAD_WIDTH, 0.002, ROAD_WIDTH]}
				color="#546e7a"
			/>
			{Array.from({ length: DASH_COUNT }, (_, index) => {
				const along = ((index + 0.5) / DASH_COUNT - 0.5) * ROAD_LENGTH;
				if (Math.abs(along) < HALF_CROSSING * S + 0.1) return null;
				return (
					<group key={index}>
						<Box
							position={[0, 0.052, along]}
							size={[0.04, 0.002, 0.25]}
							color="#eceff1"
						/>
						<Box
							position={[along, 0.052, 0]}
							size={[0.25, 0.002, 0.04]}
							color="#eceff1"
						/>
					</group>
				);
			})}
			{LANE_KEYS.map((lane) => {
				const { axis, offset, direction } = LANES[lane];
				const stop = carPosition(lane, STOP_LINE)[axis] * S;
				const position: [number, number, number] =
					axis === "z"
						? [offset * S, 0.052, stop + direction * 0.05]
						: [stop + direction * 0.05, 0.052, offset * S];
				const size: [number, number, number] =
					axis === "z"
						? [HALF_CROSSING * S, 0.002, 0.06]
						: [0.06, 0.002, HALF_CROSSING * S];
				return (
					<Box key={lane} position={position} size={size} color="#eceff1" />
				);
			})}
		</>
	);
}
