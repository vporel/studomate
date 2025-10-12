"use client";

import { Box } from "@mui/material";
import { Fragment, useRef, useState } from "react";
import { SplitPaneProps } from "./split-pane";
import useInitialSizesCalculator from "./useInitialSizesCalculator";
import useResizeHandler from "./useResizeHandler";

const SplitPane = ({ children, split = "vertical", width, height, ...props }: SplitPaneProps) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [sizes, setSizes] = useState<number[]>([]);
	const isHorizontal = split === "vertical";
	const onResize = useResizeHandler(containerRef, isHorizontal, sizes, setSizes, children);

	useInitialSizesCalculator(containerRef, children, isHorizontal, setSizes);

	return (
		<Box
			ref={containerRef}
			{...props}
			sx={{
				...props.sx,
				display: "flex",
				flexDirection: isHorizontal ? "row" : "column",
				width: isHorizontal ? "100%" : width ?? "100%",
				height: !isHorizontal ? "100%" : height ?? "100%",
			}}
		>
			{children.map((child, index) => {
				const { visible = true, initialSize, minSize, maxSize, ...rest } = child.props;

				return (
					<Fragment key={index}>
						<Box
							{...rest}
							sx={{
								...rest.sx,
								display: visible === false ? "none" : "block",
								flex: !initialSize ? 1 : "none",
								overflow: "auto",
								minWidth: isHorizontal ? minSize ?? 0 : "auto",
								maxWidth: isHorizontal ? maxSize ?? "100%" : "auto",
								minHeight: !isHorizontal ? minSize ?? 0 : "auto",
								maxHeight: !isHorizontal ? maxSize ?? "100%" : "auto",
								width: isHorizontal ? (sizes[index] ? `${sizes[index]}%` : "auto") : "100%",
								height: !isHorizontal ? (sizes[index] ? `${sizes[index]}%` : "auto") : "100%",
							}}
						>
							{child}
						</Box>

						{index < children.length - 1 && (
							<Box
								onMouseDown={(e) => onResize(index, e)}
								sx={{
									display: visible === false ? "none" : "block",
									cursor: isHorizontal ? "col-resize" : "row-resize",
									background: "lightgray",
									width: isHorizontal ? "1px" : "100%",
									height: isHorizontal ? "100%" : "1px",
									flexShrink: 0,
									userSelect: "none",
									position: "relative",
									"&:hover": {
										"&::before": {
											content: '""',
											position: "absolute",
											background: "rgb(180, 180, 180)",
											width: isHorizontal ? "3px" : "100%",
											height: isHorizontal ? "100%" : "3px",
											zIndex: 1,
											transform: isHorizontal ? "translateX(-1px)" : "translateY(-1px)",
										},
									},
								}}
							/>
						)}
					</Fragment>
				);
			})}
		</Box>
	);
};

export default SplitPane;
