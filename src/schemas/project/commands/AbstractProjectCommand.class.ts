import AbstractCommand from "@/schemas/commands/AbstractCommand.class";
import Project from "../Project.class";

export default abstract class AbstractProjectCommand<P> extends AbstractCommand<Project, P> {}
