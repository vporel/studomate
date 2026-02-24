import { TokenType } from "./TokenType.enum";

export default interface Token {
	type: TokenType;
	value: string;
	position: number; // Position in the input string for error reporting
}
