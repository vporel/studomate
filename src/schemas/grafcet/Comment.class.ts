import { Dimensions } from "./Grafcet.class";
import GrafcetElement, { BaseData } from "./GrafcetElement.class";

export type CommentData = BaseData & {
	text: string;
};

export default class Comment extends GrafcetElement<CommentData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 150,
		height: 40,
	};

	static generateDefaultData(): CommentData {
		return {
			text: "Commentaire",
			width: Comment.DEFAULT_DIMENSIONS.width,
			height: Comment.DEFAULT_DIMENSIONS.height,
		};
	}

	copy(): Comment {
		return Comment.createFromJSON(JSON.stringify(this));
	}

	static createFromJSON(json: string): Comment {
		const jsonParsed = JSON.parse(json);
		return Object.assign(
			new Comment("", { ...Comment.generateDefaultData() }, { x: 0, y: 0 }),
			jsonParsed,
		);
	}
}
