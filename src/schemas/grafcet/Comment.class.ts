import { Dimensions } from "./Grafcet.class";
import GrafcetElement from "./GrafcetElement.class";

export type CommentData = {
	text: string;
	width: number;
	height: number;
};

export default class Comment extends GrafcetElement<CommentData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 150,
		height: 40,
	};

	static DEFAULT_DATA: CommentData = {
		text: "Commentaire",
		width: Comment.DEFAULT_DIMENSIONS.width,
		height: Comment.DEFAULT_DIMENSIONS.height,
	};

	copy(): Comment {
		return new Comment(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Comment {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Comment("", { ...Comment.DEFAULT_DATA }, { x: 0, y: 0 }), jsonParsed);
	}
}
