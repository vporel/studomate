import JunctionAndEnd from "../junction-and-end.schema";
import AbstractJunctionBuilder from "./abstract-junction.builder";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionAndEndBuilder extends AbstractJunctionBuilder<JunctionAndEnd> {
	protected create(
		id: string,
		data: JunctionData,
		position: XYPosition,
		size: Dimensions,
	): JunctionAndEnd {
		return new JunctionAndEnd(id, data, position, size);
	}
}
