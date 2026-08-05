"use client";

import { APP_NAME } from "@/app-info";
import { Box, Typography } from "@mui/material";
import { Fragment } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import GrafcetPage from "./GrafcetPage";
import LadderPage from "./LadderPage";
import ProjectPropertiesPage from "./ProjectPropertiesPage";
import ProjectStartupPage from "./ProjectStartupPage";
import PagesTabBar from "./tab-bar/PagesTabBar";
import VariablesPage, { VariablesPageData } from "./VariablesPage";

const NoPage = () => {
	const commands = [
		{ label: "Ouvrir un projet", shortcut: ["Ctrl", "O"] },
		{ label: "Enregistrer le projet", shortcut: ["Ctrl", "S"] },
		{ label: "Nouveau grafcet", shortcut: ["Ctrl", "G"] },
	];

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				backgroundColor: "rgb(235, 235, 235)",
				height: "100%",
			}}
		>
			<Box
				sx={{
					width: 640,
					padding: "4rem 0",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 2,
				}}
			>
				<Box component="img" src="/images/icon.png" alt="No page" sx={{ width: "100px" }} />
				<Typography
					variant="h2"
					sx={{
						mb: 1,
						color: "white",
						backgroundColor: (th) => th.palette.primary.main,
						p: 1,
						borderRadius: "10px",
					}}
				>
					{APP_NAME}
				</Typography>
				{commands.map(({ label, shortcut }) => (
					<Box key={label} sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
						<Typography textAlign="right" sx={{ width: "250px" }}>
							{label}{" "}
						</Typography>
						<Box sx={{ display: "flex", gap: 0.5, width: "200px", alignItems: "center" }}>
							{shortcut.map((el, index) => {
								return (
									<Fragment key={el}>
										<Typography
											sx={{
												background: "lightgray",
												color: "rgb(60, 60, 60)",
												borderRadius: "5px",
												fontSize: "0.9rem",
												px: "3px",
											}}
										>
											{el}
										</Typography>
										{index < shortcut.length - 1 && " + "}
									</Fragment>
								);
							})}
						</Box>
					</Box>
				))}
			</Box>
		</Box>
	);
};

const PagesView = () => {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const { pagesData, pagesOrder } = useProjectStore(
		useShallow((state) => ({
			pagesData: state.pagesData,
			pagesOrder: state.pagesOrder,
		})),
	);

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flex: 1,
				flexDirection: "column",
				position: "relative",
			}}
		>
			{pagesOrder.length === 0 ? (
				<NoPage />
			) : (
				<Fragment>
					<PagesTabBar />
					{pagesOrder.map((id) => {
						const pageData = pagesData[id];
						if (!pageData) return null;
						switch (pageData.type) {
							case "project-startup":
								return <ProjectStartupPage key={id} />;
							case "project-properties":
								return <ProjectPropertiesPage key={id} />;
							case "variables":
								return <VariablesPage key={id} pageData={pageData as VariablesPageData} />;
							case "grafcet":
								return (
									<GrafcetPage key={id} initialGrafcet={grafcetsManager.getGrafcet(id)} />
								);
							case "ladder":
								return <LadderPage key={id} initialLadder={laddersManager.getLadder(id)} />;
							default:
								return null;
						}
					})}
				</Fragment>
			)}
		</Box>
	);
};

export default PagesView;
