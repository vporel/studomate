"use client";

import { type CrossroadsState } from "@/3d-scenes/crossroads/v1/crossroads.model";
import { useFrame } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { type Group } from "three";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import Label from "@/ui/components/3d-scene/parts/Label";
import { SCENE_ORIGIN } from "@/ui/components/3d-scene/scene-origin";
import CrossroadsCars from "./CrossroadsCars";
import CrossroadsLights from "./CrossroadsLights";
import CrossroadsRoad from "./CrossroadsRoad";
import { S } from "./crossroads-scale";

/** 3D rendering of the crossroads from the states of its physical model. */
export default function CrossroadsScene({ sample }: SceneComponentProps) {
	const t = useTranslations("scene3d.crossroads");
	const crashMarker = useRef<Group>(null);
	const [crashAt, setCrashAt] = useState<[number, number] | null>(null);
	const crashRef = useRef<CrossroadsState["crash"]>(null);
	const [accidents, setAccidents] = useState(0);
	const accidentsRef = useRef(0);
	const read = () => sample() as CrossroadsState | null;

	useFrame(() => {
		const state = read();
		if (!state) return;
		if (crashMarker.current) {
			crashMarker.current.visible = !!state.crash;
			crashMarker.current.rotation.y += 0.1;
		}
		if ((crashRef.current === null) !== (state.crash === null)) {
			setCrashAt(state.crash ? [state.crash.x * S, state.crash.z * S] : null);
		}
		crashRef.current = state.crash;
		if (accidentsRef.current !== state.accidents) {
			accidentsRef.current = state.accidents;
			setAccidents(state.accidents);
		}
	});

	return (
		<group position={SCENE_ORIGIN}>
			<CrossroadsRoad />
			<CrossroadsLights read={() => read()?.lights ?? null} />
			<CrossroadsCars read={() => read()?.lanes ?? null} />

			<group
				ref={crashMarker}
				visible={false}
				position={crashAt ? [crashAt[0], 0.4, crashAt[1]] : [0, 0.4, 0]}
			>
				<mesh>
					<octahedronGeometry args={[0.35]} />
					<meshStandardMaterial
						color="#ff5722"
						emissive="#ff5722"
						emissiveIntensity={1.5}
					/>
				</mesh>
			</group>
			{crashAt && (
				<Label position={[crashAt[0], 1.1, crashAt[1]]}>{t("collision")}</Label>
			)}
			<Label position={[-3, 0.2, -3.4]}>
				{t("accidents", { count: accidents })}
			</Label>
		</group>
	);
}
