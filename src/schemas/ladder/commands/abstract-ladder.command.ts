import AbstractCommand from "@/schemas/commands/abstract.command";
import Ladder from "../ladder.schema";

export default abstract class AbstractLadderCommand<P> extends AbstractCommand<Ladder, P> {}
