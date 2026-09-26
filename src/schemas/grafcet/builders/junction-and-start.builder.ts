import JunctionAndStart from "../junction-and-start.schema";
import AbstractJunctionBuilder from "./abstract-junction.builder";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionAndStartBuilder extends AbstractJunctionBuilder<JunctionAndStart> {
	protected create(
		id: string,
		data: JunctionData,
		position: XYPosition,
		size: Dimensions,
	): JunctionAndStart {
		return new JunctionAndStart(id, data, position, size);
	}
}
