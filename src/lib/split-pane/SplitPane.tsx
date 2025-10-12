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
			style={{
				display: "flex",
				flexDirection: isHorizontal ? "row" : "column",
				width: "100%",
				height: "100%",
			}}
		>
			{children.map((child, index) => (
				<Fragment key={index}>
					<Box
						style={{
							flex: sizes.length === 0 && !child.props.initialSize ? 1 : "none",
							overflow: "auto",
							minWidth: isHorizontal ? child.props.minSize ?? 0 : "auto",
							maxWidth: isHorizontal ? child.props.maxSize ?? "100%" : "auto",
							minHeight: !isHorizontal ? child.props.minSize ?? 0 : "auto",
							maxHeight: !isHorizontal ? child.props.maxSize ?? "100%" : "auto",
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
			))}
		</Box>
	);
};

export default SplitPane;
