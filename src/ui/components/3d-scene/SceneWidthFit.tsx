"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Vector3 } from "three";
import {
	scaleDistanceToTarget,
	widthFitDistanceFactor,
} from "./scene-width-fit";

/**
 * Keeps the whole width of the scene in a view narrower than the one its camera was framed for
 * (the side panel), by moving the camera back from the target of the default controls. Resizing
 * keeps the orbit and the zoom the user chose, relative to the new view.
 */
export default function SceneWidthFit() {
	const camera = useThree((state) => state.camera);
	const controls = useThree(
		(state) => state.controls as { target: Vector3; update(): void } | null,
	);
	const width = useThree((state) => state.size.width);
	const height = useThree((state) => state.size.height);
	const appliedFactor = useRef(1);

	useEffect(() => {
		if (!controls || height === 0) return;
		const factor = widthFitDistanceFactor(width / height);
		const ratio = factor / appliedFactor.current;
		appliedFactor.current = factor;
		if (ratio === 1) return;
		scaleDistanceToTarget(camera.position, controls.target, ratio);
		controls.update();
	}, [camera, controls, width, height]);

	return null;
}
