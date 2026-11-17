"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useState } from "react";

export const labelStyle: React.CSSProperties = {
	background: "rgba(255,255,255,0.85)",
	padding: "2px 6px",
	borderRadius: 4,
	fontSize: 13,
	whiteSpace: "nowrap",
	pointerEvents: "none",
};

/** Stacks the labels with the scene, under the floating boxes laid over it (z-index 20). */
const LABEL_Z_INDEX_RANGE: [number, number] = [10, 0];

/** Text anchored to a point of the scene, mounted once the first frame has been rendered. */
export default function Label({
	position,
	style = labelStyle,
	children,
}: {
	position: [number, number, number];
	style?: React.CSSProperties;
	children: React.ReactNode;
}) {
	const [ready, setReady] = useState(false);
	useFrame(() => {
		if (!ready) setReady(true);
	});
	if (!ready) return null;
	return (
		<Html
			position={position}
			center
			distanceFactor={9}
			zIndexRange={LABEL_Z_INDEX_RANGE}
		>
			<div style={style}>{children}</div>
		</Html>
	);
}
