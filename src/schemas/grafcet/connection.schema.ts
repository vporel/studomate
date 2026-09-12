import {
	default as SharedConnection,
	ConnectionSide as SharedConnectionSide,
	ConnectionData as SharedConnectionData,
	HandleType as SharedHandleType,
} from "../shared/connection.schema";
import { ElementType } from "./element.schema";

export type ConnectionSide = SharedConnectionSide<ElementType>;
export type ConnectionData = SharedConnectionData;
export type HandleType = SharedHandleType;

export default class Connection extends SharedConnection<ElementType> {}
