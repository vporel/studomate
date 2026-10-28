"use client";

import { Typography } from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import { useShallow } from "zustand/shallow";
import HmiSimulationPageView from "../hmi/HmiSimulationPageView";
import GrafcetPage from "../pages/GrafcetPage";
import LadderPage from "../pages/LadderPage";
import { isVariablesPageId } from "@/ui/stores/project/variables-pages";
import Page from "../pages/Page";
import { useProjectStore } from "../projects/ProjectContext";
import dynamic from "next/dynamic";
import EmbeddedLoading from "./EmbeddedLoading";
import EmbeddedHmiView from "./EmbeddedHmiView";
import { useEmbeddedViews } from "./EmbeddedProjectProvider";

function PageLoading() {
	const t = useT("embedded");
	return <EmbeddedLoading label={t("loading")} />;
}

//Three.js and WebGL are loaded when the scene is first displayed.
const EmbeddedSceneView = dynamic(() => import("./EmbeddedSceneView"), {
	ssr: false,
	loading: () => <PageLoading />,
});
const EmbeddedVariablesView = dynamic(() => import("./EmbeddedVariablesView"), {
	ssr: false,
	loading: () => <PageLoading />,
});

function UnavailableView({ pageId }: { pageId: string }) {
	const t = useT("embedded.unavailable");
	const problem = useEmbeddedViews().find(
		(view) => view.page.id === pageId,
	)?.problem;
	const reason = problem?.reason ?? "unknown";
	return (
		<Page
			pageId={pageId}
			sx={{ justifyContent: "center", alignItems: "center", p: 2 }}
		>
			<Typography role="alert" sx={{ color: "text.secondary" }}>
				{reason === "unknown"
					? t("unknown")
					: reason === "scene3d"
						? t("scene3d")
						: t(reason, { id: problem?.id ?? "" })}
			</Typography>
		</Page>
	);
}

/** Mounts every tab of the block; only the active one is displayed. */
export default function EmbeddedPages() {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const { pagesData, pagesOrder } = useProjectStore(
		useShallow((state) => ({
			pagesData: state.pagesData,
			pagesOrder: state.pagesOrder,
		})),
	);

	return (
		<>
			{pagesOrder.map((id) => {
				const pageData = pagesData[id];
				if (!pageData) return null;
				switch (pageData.type) {
					case "grafcet":
						return (
							<GrafcetPage
								key={id}
								initialGrafcet={grafcetsManager.getProgramOrThrow(id)}
								fitToContainer
							/>
						);
					case "ladder":
						return (
							<LadderPage
								key={id}
								initialLadder={laddersManager.getProgramOrThrow(id)}
							/>
						);
					case "hmi":
						return <EmbeddedHmiView key={id} pageId={id} />;
					case "hmi-simulation":
						return (
							<HmiSimulationPageView key={id} tabPageId={id} fitToContainer />
						);
					case "scene3d-view":
						return <EmbeddedSceneView key={id} pageId={id} />;
					case "variables":
						return isVariablesPageId(id) ? (
							<EmbeddedVariablesView key={id} pageId={id} />
						) : null;
					case "embedded-unavailable":
						return <UnavailableView key={id} pageId={id} />;
					default:
						return null;
				}
			})}
		</>
	);
}
