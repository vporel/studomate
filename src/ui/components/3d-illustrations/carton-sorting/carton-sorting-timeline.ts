/** Scripted sorting cycle of the carton-sorting illustration: world units, seconds. */

export const STATION_X = 5.16;
export const T1_START_X = -0.6;
export const T1_WIDTH = 0.6;
export const CHANNEL_WIDTH = 0.7;
export const CHANNEL_START_Z = T1_WIDTH / 2;
export const CHANNEL_END_Z = 3.2;
export const LOW_Z = 1.92;
export const HIGH_Z = 2.76;
export const OUTPUT_LENGTH = 2;
/** Carton centre once pushed off T1 into the channel: its back face clears T1's edge. */
export const ENTRY_Z = 0.62;
export const P1_STROKE = ENTRY_Z;
export const SIDE_STROKE = 1;

const APPEAR_X = -0.3;
const T1_SPEED = 1.8;
const T2_SPEED = 1.2;
const APPEAR = 0.3;
const PUSH_OUT = 0.5;
const PUSH_IN = 0.4;
const HOLD = 0.6;
/** Sorted cartons shrink away at the end of the loop, before it restarts empty. */
export const FADE = 0.4;

export type IllustrationCarton = {
	x: number;
	z: number;
	tall: boolean;
	scale: number;
};

export type CartonSortingIllustrationState = {
	t1Running: boolean;
	t2Running: boolean;
	/** Cylinder strokes, in world units. */
	p1: number;
	p2: number;
	p3: number;
	cartons: IllustrationCarton[];
};

type Phase = {
	duration: number;
	apply: (
		ratio: number,
		state: CartonSortingIllustrationState,
		carton: IllustrationCarton,
	) => void;
};

const lerp = (from: number, to: number, ratio: number) =>
	from + (to - from) * ratio;

const cartonPhases = (tall: boolean): Phase[] => {
	const targetZ = tall ? HIGH_Z : LOW_Z;
	const pusher = tall ? "p3" : "p2";
	return [
		{
			duration: APPEAR,
			apply: (r, s, c) => {
				s.t1Running = true;
				c.x = APPEAR_X;
				c.scale = r;
			},
		},
		{
			duration: (STATION_X - APPEAR_X) / T1_SPEED,
			apply: (r, s, c) => {
				s.t1Running = true;
				c.x = lerp(APPEAR_X, STATION_X, r);
			},
		},
		{
			duration: PUSH_OUT,
			apply: (r, s, c) => {
				s.p1 = r * P1_STROKE;
				c.x = STATION_X;
				c.z = lerp(0, ENTRY_Z, r);
			},
		},
		{
			duration: PUSH_IN,
			apply: (r, s, c) => {
				s.p1 = (1 - r) * P1_STROKE;
				c.x = STATION_X;
				c.z = ENTRY_Z;
			},
		},
		{
			duration: (targetZ - ENTRY_Z) / T2_SPEED,
			apply: (r, s, c) => {
				s.t2Running = true;
				c.x = STATION_X;
				c.z = lerp(ENTRY_Z, targetZ, r);
			},
		},
		{
			duration: PUSH_OUT,
			apply: (r, s, c) => {
				s[pusher] = r * SIDE_STROKE;
				c.x = lerp(STATION_X, STATION_X + SIDE_STROKE, r);
				c.z = targetZ;
			},
		},
		{
			duration: PUSH_IN,
			apply: (r, s, c) => {
				s[pusher] = (1 - r) * SIDE_STROKE;
				c.x = STATION_X + SIDE_STROKE;
				c.z = targetZ;
			},
		},
		{ duration: HOLD, apply: () => {} },
	];
};

const CYCLE = [false, true].map((tall) => ({
	tall,
	phases: cartonPhases(tall),
}));

const cartonDuration = (phases: Phase[]) =>
	phases.reduce((sum, phase) => sum + phase.duration, 0);

export const LOOP_DURATION =
	CYCLE.reduce((sum, { phases }) => sum + cartonDuration(phases), 0) + FADE;

/** Scene state `time` seconds into the loop (any time, wrapped to the loop). */
const idleState = (): CartonSortingIllustrationState => ({
	t1Running: false,
	t2Running: false,
	p1: 0,
	p2: 0,
	p3: 0,
	cartons: [],
});

export function sampleCartonSorting(
	time: number,
): CartonSortingIllustrationState {
	const t = ((time % LOOP_DURATION) + LOOP_DURATION) % LOOP_DURATION;
	const state = idleState();
	const fading = t > LOOP_DURATION - FADE;
	const fadeScale = fading ? (LOOP_DURATION - t) / FADE : 1;

	let start = 0;
	for (const { tall, phases } of CYCLE) {
		if (t < start) break;
		const carton: IllustrationCarton = { x: APPEAR_X, z: 0, tall, scale: 1 };
		let phaseStart = start;
		for (const phase of phases) {
			const local = t - phaseStart;
			if (local < 0) break;
			const inProgress = local < phase.duration;
			// Finished phases still place the carton, but only the phase in progress drives
			// the belts and cylinders.
			phase.apply(
				inProgress ? local / phase.duration : 1,
				inProgress ? state : idleState(),
				carton,
			);
			phaseStart += phase.duration;
		}
		carton.scale *= fadeScale;
		state.cartons.push(carton);
		start += cartonDuration(phases);
	}
	return state;
}
