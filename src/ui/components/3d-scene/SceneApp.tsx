"use client";

import { createBrowserSceneTransport } from "@/3d-scenes/link/scene-channel";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SCENE_ORIGIN } from "@/ui/components/3d-scene/scene-origin";
import ProjectTitle from "./ProjectTitle";
import SceneView, { type SceneViewPhase } from "./scene-view";
import { getSceneViewDefinition, type SceneCamera } from "./scene-views";

const PHASE_KEYS = {
	waiting: "waiting",
	stopped: "stopped",
	running: "running",
	paused: "paused",
	"editor-closed": "editorClosed",
} as const satisfies Record<SceneViewPhase, string>;

export default function SceneApp({ session }: { session: string }) {
	const t = useTranslations("scene3d");
	const [view, setView] = useState<SceneView | null>(null);

	useEffect(() => {
		const created = new SceneView({
			transport: createBrowserSceneTransport(session),
			now: () => performance.now(),
			getLerp: (sceneId, sceneVersion) =>
				getSceneViewDefinition(sceneId, sceneVersion)?.interpolate,
			onClose: () => window.close(),
		});
		setView(created);
		return () => {
			created.dispose();
			setView(null);
		};
	}, [session]);

	if (!view) return null;
	return <SceneContent view={view} />;
}

const DEFAULT_CAMERA: SceneCamera = {
	position: [4, 6, 7],
	target: SCENE_ORIGIN,
};

const NO_SNAPSHOT = {
	phase: "waiting",
	sceneId: null,
	sceneVersion: null,
	projectName: null,
} as const;

function SceneContent({ view }: { view: SceneView }) {
	const t = useTranslations("scene3d");
	const { phase, sceneId, sceneVersion, projectName } = useSyncExternalStore(
		view.subscribe,
		view.getSnapshot,
		() => NO_SNAPSHOT,
	);
	useEffect(() => {
		document.title = projectName
			? t("titleWithProject", { project: projectName })
			: t("title");
	}, [projectName, t]);
	const definition =
		sceneId && sceneVersion !== null
			? getSceneViewDefinition(sceneId, sceneVersion)
			: undefined;
	const camera = definition?.camera ?? DEFAULT_CAMERA;
	const interactive = phase === "running" || phase === "paused";
	const sample = useCallback(() => view.sampleState(), [view]);
	const send = useCallback(
		(interaction: unknown) => view.sendInteraction(interaction),
		[view],
	);

	return (
		<div style={{ position: "fixed", inset: 0, background: "#eef1f3" }}>
			<Canvas
				key={`${sceneId}@${sceneVersion}`}
				camera={{ position: camera.position, fov: 50 }}
			>
				<ambientLight intensity={0.7} />
				<directionalLight position={[5, 8, 4]} intensity={1.2} />
				{definition && (
					<definition.Component
						sample={sample}
						interactive={interactive}
						send={send}
					/>
				)}
				<gridHelper args={[20, 20]} position={[4, -0.06, 1.5]} />
				<OrbitControls target={camera.target} />
			</Canvas>
			<ProjectTitle name={projectName} />
			{definition?.Controls && (
				<div style={{ position: "absolute", top: 12, right: 12 }}>
					<definition.Controls
						sample={sample}
						interactive={interactive}
						send={send}
					/>
				</div>
			)}
			<div
				style={{
					position: "absolute",
					top: 12,
					left: 12,
					padding: "6px 12px",
					borderRadius: 6,
					background: "rgba(0,0,0,0.65)",
					color: "white",
					font: "14px system-ui, sans-serif",
				}}
			>
				{sceneId && !definition
					? t("unknownScene")
					: t(`status.${PHASE_KEYS[phase]}`)}
			</div>
		</div>
	);
}
