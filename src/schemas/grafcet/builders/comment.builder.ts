import Comment, { CommentData } from "../comment.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class CommentBuilder {
	private _id: string;
	private _data: CommentData;
	private _position: XYPosition;
	private _size: Dimensions;

	constructor() {
		this._id = "";
		this._data = {
			text: "",
		};
		this._position = { x: 0, y: 0 };
		this._size = { ...Comment.DEFAULT_DIMENSIONS };
	}

	id(id: string): CommentBuilder {
		this._id = id;
		return this;
	}

	text(text: string): CommentBuilder {
		this._data.text = text;
		return this;
	}

	dimensions(width: number, height: number): CommentBuilder {
		this._size = { width, height };
		return this;
	}

	position(x: number, y: number): CommentBuilder {
		this._position = { x, y };
		return this;
	}

	build(): Comment {
		return new Comment(
			this._id,
			{ ...this._data },
			{ ...this._position },
			{ ...this._size },
		);
	}
}
