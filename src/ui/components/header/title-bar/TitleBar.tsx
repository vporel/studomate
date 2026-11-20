"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import AppToolbar from "@/ui/components/app-toolbar/AppToolbar";
import AppLanguageSwitch from "@/ui/components/language-switch/AppLanguageSwitch";
import AccountStatus from "@/ui/components/auth/AccountStatus";
import ShareProjectButton from "@/ui/components/projects/ShareProjectButton";
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
			<FlexBox
				centerVertical
				sx={{ width: 350, justifyContent: "flex-end", px: 1, gap: 1 }}
			>
				<AppLanguageSwitch />
				<ShareProjectButton
					source="title-bar"
					size="small"
					color="inherit"
					sx={{ textTransform: "none", py: 0 }}
				/>
				<AccountStatus />
			</FlexBox>
		</FlexBox>
	);
};

export default TitleBar;
