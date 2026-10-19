import {
	carPosition,
	HALF_CROSSING,
	LANE_KEYS,
	LANES,
	STOP_LINE,
	type LaneKey,
	type LightState,
} from "@/3d-scenes/crossroads/v1/crossroads.model";
import TrafficLightHead from "@/ui/components/3d-scene/parts/TrafficLightHead";
import { S } from "./crossroads-scale";

/** The poles stand on the right-hand edge of the road, just before the stop line. */
function lightPlacement(lane: LaneKey): {
	position: [number, number, number];
	rotationY: number;
} {
	const { axis, offset, heading } = LANES[lane];
	const along = carPosition(lane, STOP_LINE)[axis];
	const side = Math.sign(offset) * (HALF_CROSSING + 12);
	const [x, z] = axis === "z" ? [side, along] : [along, side];
	return { position: [x * S, 0, z * S], rotationY: heading + Math.PI };
}

/** The four traffic lights; `read` gives their bulbs for the current frame. */
export default function CrossroadsLights({
	read,
}: {
	read: () => Record<LaneKey, LightState> | null;
}) {
	return (
		<>
			{LANE_KEYS.map((lane) => {
				const { position, rotationY } = lightPlacement(lane);
				return (
					<TrafficLightHead
						key={lane}
						position={position}
						rotationY={rotationY}
						read={() => read()?.[lane] ?? null}
					/>
				);
			})}
		</>
	);
}
