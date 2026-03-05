"use client";
import { Box } from "@mui/material";
import { ForwardedRef, forwardRef } from "react";
import { CustomBoxProps } from "./types";

const FlexBox = forwardRef(function <C extends React.ElementType = "div">(
	{
		children,
		fullSize,
		between,
		around,
		end,
		center,
		centerHorizontal,
		centerVertical,
		wrap,
		justifyContent,
		alignItems,
		column,
		flexDirection,
		flexWrap,
		width,
		height,
		...props
	}: CustomBoxProps<C> & {
		fullSize?: boolean;
		between?: boolean;
		around?: boolean;
		end?: boolean;
		center?: boolean;
		centerHorizontal?: boolean;
		centerVertical?: boolean;
		column?: boolean;
		wrap?: boolean;
	},
	ref: ForwardedRef<HTMLElement>
) {
	return (
		<Box
			ref={ref}
			display="flex"
			width={fullSize ? "100%" : width}
			height={fullSize ? "100%" : height}
			justifyContent={
				center || centerHorizontal
					? "center"
					: between
					? "space-between"
					: around
					? "space-around"
					: end
					? "flex-end"
					: justifyContent
			}
			alignItems={center || centerVertical ? "center" : alignItems}
			flexDirection={column ? "column" : flexDirection}
			flexWrap={wrap ? "wrap" : flexWrap}
			{...props}
		>
			{children}
		</Box>
	);
});

FlexBox.displayName = "FlexBox";

export default FlexBox;
