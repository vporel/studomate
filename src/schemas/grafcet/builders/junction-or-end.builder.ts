import JunctionOrEnd from "../junction-or-end.schema";
import AbstractJunctionBuilder from "./abstract-junction.builder";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionOrEndBuilder extends AbstractJunctionBuilder<JunctionOrEnd> {
	protected create(
		id: string,
		data: JunctionData,
		position: XYPosition,
		size: Dimensions,
	): JunctionOrEnd {
		return new JunctionOrEnd(id, data, position, size);
	}
}
