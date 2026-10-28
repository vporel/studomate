"use client";

import type { SceneTransport } from "@/3d-scenes/link/scene-channel";
import { useEffect, useState } from "react";
import { SceneContent } from "./SceneApp";
import SceneView from "./scene-view";
import { getSceneViewDefinition } from "./scene-views";

/**
 * A 3D scene shown inside the page. `openTransport` returns the end of the link shared with its
 * editor, and is called again each time the effect runs: a transport is single-use, closed
 * with the view that reads it.
 */
export default function InlineScene({
	openTransport,
	onDisconnect,
}: {
	openTransport: () => SceneTransport;
	onDisconnect: () => void;
}) {
	const [view, setView] = useState<SceneView | null>(null);

	useEffect(() => {
		const created = new SceneView({
			transport: openTransport(),
			now: () => performance.now(),
			getLerp: (sceneId, sceneVersion) =>
				getSceneViewDefinition(sceneId, sceneVersion)?.interpolate,
			onClose: () => {},
		});
		setView(created);
		return () => {
			created.dispose();
			onDisconnect();
			setView(null);
		};
	}, [openTransport, onDisconnect]);

	if (!view) return null;
	return <SceneContent view={view} inline />;
}
