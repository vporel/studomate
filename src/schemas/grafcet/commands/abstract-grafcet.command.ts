import AbstractCommand from "@/schemas/commands/abstract.command";
import Grafcet from "../grafcet.schema";

export default abstract class AbstractGrafcetCommand<P> extends AbstractCommand<Grafcet, P> {}
