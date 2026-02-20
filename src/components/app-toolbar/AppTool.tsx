"use client";

import { Box } from "@mui/material";
import React from "react";

const AppTool = ({
	disabled,
	name,
	onClick,
	children,
}: {
	disabled?: boolean;
	name: string;
	onClick?: () => void;
	children: React.ReactElement;
}) => {
	return (
		<Box
			tabIndex={0}
			className={`app-toolbar__tool app-toolbar__${name} ${
				disabled ? " app-toolbar__tool--disabled" : ""
			}`}
			onClick={() => {
				if (!disabled && onClick) {
					onClick();
				}
			}}
			sx={{
				width: "fit-content",
				cursor: disabled ? "not-allowed" : "pointer",
				userSelect: "none",
				textAlign: "center",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				opacity: disabled ? 0.4 : 1,
				"&:hover": {
					background: "rgb(240, 240, 240)",
				},
			}}
		>
			{children}
		</Box>
	);
};

export default AppTool;
