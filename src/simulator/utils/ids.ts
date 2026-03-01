import { nanoid } from "nanoid";

export function createRandomId() {
	return nanoid(15);
}
