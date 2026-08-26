"use client";
import Comment, { CommentData } from "@/schemas/grafcet/comment.schema";
import { useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer } from "@xyflow/react";
import React, { type FC } from "react";

import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type CommentNodeType = Node<CommentData> & { type: "comment" };

export type CommentNodeProps = NodeProps<CommentNodeType>;

const CommentNode: FC<CommentNodeProps> = ({ id, data, selected, width, height }) => {
	const th = useTheme();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [editingText, setEditingText, editing, setEditing, saveText, error] = useWithTextNodeValue(
		id,
		"comment",
		data,
		"text",
		false,
	);

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={Comment.DEFAULT_DIMENSIONS.width}
				minHeight={Comment.DEFAULT_DIMENSIONS.height}
			/>
			<GrafcetNode
				id={id}
				type="comment"
				error={error}
				sx={{
					width: (width ?? Comment.DEFAULT_DIMENSIONS.width) + "px",
					height: (height ?? Comment.DEFAULT_DIMENSIONS.height) + "px",
					borderWidth: "1px",
					borderStyle: "dashed",
					borderColor: borderColor,
					borderRadius: "5px",
					backgroundColor: "white",
					padding: "5px",
					display: "flex",
					alignItems: "center",
					transition: "background .2s ease, borderColor .2s ease",
					"&:hover": {
						background: "#efefef",
					},
				}}
				onDoubleClick={() => {
					setEditing(true);
					textareaRef.current?.focus();
				}}
			>
				<textarea
					ref={textareaRef}
					className="node__input comment_node__textarea nodrag"
					value={editingText}
					onChange={(e) => setEditingText(e.target.value)}
					rows={1}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							//The save is done only on blur to avoid multiple saves when pressing enter
							textareaRef.current?.blur();
						}
					}}
					onBlur={() => {
						setEditing(false);
						saveText();
					}}
					style={{
						width: "100%",
						height: "100%",
						border: "none",
						outline: "none",
						resize: "none",
						overflow: "hidden",
						padding: "0",
						lineHeight: "1rem",
						pointerEvents: !editing ? "none" : "all",
						fontSize: "0.8rem",
						overflowY: "auto",
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default CommentNode;
