"use client";

import Box from "./Box";
import Label, { markStyle } from "./Label";

const LEVER_TILT = 0.55;

/** Two-position selector: the lever leans toward the low mark (left) or the high mark (right). */
export default function ToggleSwitch({
	position,
	label,
	lowLabel,
	highLabel,
	on,
	onToggle,
}: {
	position: [number, number, number];
	label: string;
	lowLabel: string;
	highLabel: string;
	on: boolean;
	onToggle: () => void;
}) {
	return (
		<group
			position={position}
			onClick={(event) => {
				event.stopPropagation();
				onToggle();
			}}
		>
			<Box position={[0, 0.03, 0]} size={[0.8, 0.06, 0.4]} color="#455a64" />
			<group
				position={[0, 0.06, 0]}
				rotation={[0, 0, on ? -LEVER_TILT : LEVER_TILT]}
			>
				<mesh position={[0, 0.14, 0]}>
					<boxGeometry args={[0.08, 0.28, 0.08]} />
					<meshStandardMaterial color={on ? "#ef6c00" : "#1976d2"} />
				</mesh>
			</group>
			<Label position={[-0.65, 0.1, 0]} style={markStyle}>
				{lowLabel}
			</Label>
			<Label position={[0.65, 0.1, 0]} style={markStyle}>
				{highLabel}
			</Label>
			<Label position={[0, 0.55, 0]}>{label}</Label>
		</group>
	);
}
