"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import AppToolbar from "@/ui/components/app-toolbar/AppToolbar";
import AnalyseButton from "./AnalyseButton";
import ProjectModeSwitcher from "./ProjectModeSwitcher";
import ProjectNameInput from "./ProjectNameInput";
import UnsavedChangesIndicator from "./UnsavedChangesIndicator";

const TitleBar = () => {
	return (
		<FlexBox
			centerVertical
			sx={{
				width: "100%",
				height: "25px",
				backgroundColor: "white",
				paddingLeft: "5px",
				gap: "10px",
				justifyContent: "space-between",
			}}
		>
			<FlexBox centerVertical sx={{ width: 350, gap: 1 }}>
				<AppToolbar />
				<UnsavedChangesIndicator />
			</FlexBox>
			<ProjectNameInput />
			<FlexBox centerVertical sx={{ width: 350, justifyContent: "flex-end", px: 1, gap: 1 }}>
				<AnalyseButton />
				<ProjectModeSwitcher />
			</FlexBox>
		</FlexBox>
	);
};

export default TitleBar;
