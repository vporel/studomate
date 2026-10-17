import JunctionOrStart from "../junction-or-start.schema";
import AbstractJunctionBuilder from "./abstract-junction.builder";
import { JunctionData } from "../junction.schema";
import { Dimensions, XYPosition } from "../shared-types";

export default class JunctionOrStartBuilder extends AbstractJunctionBuilder<JunctionOrStart> {
	protected create(
		id: string,
		data: JunctionData,
		position: XYPosition,
		size: Dimensions,
	): JunctionOrStart {
		return new JunctionOrStart(id, data, position, size);
	}
}
