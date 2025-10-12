"use client";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { SvgIconProps } from "@mui/material/SvgIcon";

const InclinedAccountTree = (props: SvgIconProps) => {
	return (
		<AccountTreeIcon
			{...props}
			sx={{
				transform: "rotate(90deg) translateX(-1px)",
				...props.sx,
			}}
		/>
	);
};

export default InclinedAccountTree;
