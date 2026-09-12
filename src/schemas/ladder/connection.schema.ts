import {
	default as SharedConnection,
	ConnectionSide as SharedConnectionSide,
	ConnectionData as SharedConnectionData,
} from "../shared/connection.schema";
import { LadderElementKind } from "./element.schema";

export type ConnectionSide = SharedConnectionSide<LadderElementKind>;
export type ConnectionData = SharedConnectionData;

export default class Connection extends SharedConnection<LadderElementKind> {}
