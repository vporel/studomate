"use client";

import { useEffect, useRef, useState } from "react";
import Box from "./Box";
import Label from "./Label";

export default function PushButton({
	position,
	label,
	disabled = false,
	onPress,
}: {
	position: [number, number, number];
	label: string;
	/** A disabled button is greyed and does not react. */
	disabled?: boolean;
	onPress: () => void;
}) {
	const [pressed, setPressed] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	return (
		<group position={position}>
			<mesh
				position={[0, pressed ? 0.06 : 0.12, 0]}
				onClick={(event) => {
					event.stopPropagation();
					if (disabled) return;
					setPressed(true);
					if (timer.current) clearTimeout(timer.current);
					timer.current = setTimeout(() => setPressed(false), 200);
					onPress();
				}}
			>
				<cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
				<meshStandardMaterial color={disabled ? "#90a4ae" : "#2e7d32"} />
			</mesh>
			<Box position={[0, 0.03, 0]} size={[0.5, 0.06, 0.5]} color="#455a64" />
			<Label position={[0, 0.55, 0]}>{label}</Label>
		</group>
	);
}
