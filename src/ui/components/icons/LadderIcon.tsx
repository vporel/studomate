"use client";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

const LadderIcon = (props: SvgIconProps) => {
	return (
		<SvgIcon {...props} viewBox="0 0 24 24">
			<path
				d="M5 2 L5 22 M19 2 L19 22 M5 6 L19 6 M5 12 L19 12 M5 18 L19 18"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</SvgIcon>
	);
};

export default LadderIcon;
