"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { PerspectiveCamera, Vector3, type Group } from "three";
import labelZoom from "./label-zoom";

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

const DISTANCE_FACTOR = 9;
const ZOOM_EPSILON = 0.001;
const anchorPosition = new Vector3();
const cameraPosition = new Vector3();

/**
 * Text anchored to a point of the scene, mounted once the first frame has been rendered.
 * Its size follows the camera distance through the CSS `zoom` of the content, which lays the
 * text out at its displayed size so that it stays sharp when zooming in.
 */
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
	const anchor = useRef<Group>(null);
	const content = useRef<HTMLDivElement>(null);
	const appliedZoom = useRef(NaN);
	useFrame(({ camera }) => {
		if (!ready) setReady(true);
		if (!anchor.current || !content.current) return;
		if (!(camera instanceof PerspectiveCamera)) return;
		anchor.current.getWorldPosition(anchorPosition);
		camera.getWorldPosition(cameraPosition);
		const zoom = labelZoom(
			anchorPosition.distanceTo(cameraPosition),
			camera.fov,
			DISTANCE_FACTOR,
		);
		if (Math.abs(zoom - appliedZoom.current) < ZOOM_EPSILON) return;
		appliedZoom.current = zoom;
		content.current.style.zoom = String(zoom);
	});
	return (
		<group ref={anchor} position={position}>
			{ready && (
				<Html center zIndexRange={LABEL_Z_INDEX_RANGE}>
					<div ref={content} style={style}>
						{children}
					</div>
				</Html>
			)}
		</group>
	);
}
