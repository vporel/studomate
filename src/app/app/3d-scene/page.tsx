"use client";

import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const SceneApp = dynamic(() => import("@/ui/components/3d-scene/SceneApp"), {
	ssr: false,
});

function ScenePage() {
	const session = useSearchParams().get("session");
	if (!session) return null;
	return <SceneApp session={session} />;
}

export default function Page() {
	return (
		<LocaleProvider>
			<Suspense>
				<ScenePage />
			</Suspense>
		</LocaleProvider>
	);
}
