"use client";

import MemoryIcon from "@mui/icons-material/Memory";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import { Fragment } from "react";
import { useT } from "@/ui/i18n/useT";
import CustomTreeItem from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import { ExplorerItemsProps } from "./explorer-items-props";
import {
	HARDWARE_CONFIGURATION_PAGE_DATA,
	SCENE3D_CONFIGURATION_PAGE_DATA,
} from "@/ui/stores/project/pages-data";

const ExplorerConfigurationItems = ({
	styles,
}: Pick<ExplorerItemsProps, "styles">) => {
	const t = useT("explorer.configurationItems");
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<Fragment>
			<CustomTreeItem
				itemId="hardware-configuration"
				label={t("hardware")}
				IconComponent={MemoryIcon}
				styles={styles}
				onClick={() => pagesManager.openPage(HARDWARE_CONFIGURATION_PAGE_DATA)}
			/>
			<CustomTreeItem
				itemId="scene3d-configuration"
				label={t("scene3d")}
				IconComponent={ViewInArIcon}
				styles={styles}
				onClick={() => pagesManager.openPage(SCENE3D_CONFIGURATION_PAGE_DATA)}
			/>
		</Fragment>
	);
};

export default ExplorerConfigurationItems;
