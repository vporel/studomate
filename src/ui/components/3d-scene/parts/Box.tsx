"use client";

export default function Box({
	position,
	size,
	color,
}: {
	position: [number, number, number];
	size: [number, number, number];
	color: string;
}) {
	return (
		<mesh position={position}>
			<boxGeometry args={size} />
			<meshStandardMaterial color={color} />
		</mesh>
	);
}
