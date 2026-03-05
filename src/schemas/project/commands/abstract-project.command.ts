import AbstractCommand from "@/schemas/commands/abstract.command";
import Project from "../project.schema";

export default abstract class AbstractProjectCommand<P> extends AbstractCommand<Project, P> {}
