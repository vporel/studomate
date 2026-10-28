"use client";

import { useT } from "@/ui/i18n/useT";
import { Box, type SvgIconProps } from "@mui/material";
import type { ComponentType } from "react";
import { useShallow } from "zustand/shallow";
import LadderIcon from "../icons/LadderIcon";
import LadderMainIcon from "../icons/LadderMainIcon";
import PageLockIcon from "../pages/tab-bar/PageLockIcon";
import { TYPE_ICONS } from "../pages/tab-bar/PageTab";
import { useProjectStore } from "../projects/ProjectContext";
import getVisibleTabIds from "./visible-tab-ids";

/** One tab per page of the block; unlike the application, tabs can neither be closed nor moved. */
export default function EmbeddedTabBar() {
	const t = useT("pages.tabBar");
	const { pagesData, pagesOrder, activePageId, project, pagesManager } =
		useProjectStore(
			useShallow((state) => ({
				pagesData: state.pagesData,
				pagesOrder: state.pagesOrder,
				activePageId: state.activePageId,
				project: state.project,
				pagesManager: state.pagesManager,
			})),
		);

	return (
		<Box
			role="tablist"
			aria-label={t("ariaLabel")}
			sx={{
				display: "flex",
				overflowX: "auto",
				flexShrink: 0,
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
			}}
		>
			{getVisibleTabIds(pagesOrder, pagesData).map((id) => {
				const page = pagesData[id];
				if (!page) return null;
				const active = id === activePageId;
				const Icon: ComponentType<SvgIconProps> =
					page.type === "ladder"
						? project?.ladders[id]?.isMain()
							? LadderMainIcon
							: LadderIcon
						: (TYPE_ICONS[page.type] as ComponentType<SvgIconProps>);
				return (
					<Box
						key={id}
						component="button"
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => pagesManager.setActivePage(id)}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 0.75,
							px: 1.5,
							py: 0.75,
							border: "none",
							borderBottom: "2px solid",
							borderBottomColor: active ? "primary.main" : "transparent",
							backgroundColor: "transparent",
							color: active ? "primary.main" : "text.primary",
							cursor: "pointer",
							font: "inherit",
							fontSize: "0.85rem",
							whiteSpace: "nowrap",
							"&:hover": { backgroundColor: "rgb(245, 245, 245)" },
						}}
					>
						<Icon fontSize="small" sx={{ fontSize: "1.1rem" }} />
						{page.title}
						<PageLockIcon pageId={id} />
					</Box>
				);
			})}
		</Box>
	);
}
