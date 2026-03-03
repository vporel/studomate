import Action from "../action.schema";
import Comment from "../comment.schema";
import Connection from "../connection.schema";
import Grafcet, { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME, GrafcetFormat } from "../grafcet.schema";
import JunctionAndEnd from "../junction-and-end.schema";
import JunctionAndStart from "../junction-and-start.schema";
import JunctionOrEnd from "../junction-or-end.schema";
import JunctionOrStart from "../junction-or-start.schema";
import StepReferralSource from "../step-referral-source.schema";
import StepReferralTarget from "../step-referral-target.schema";
import Step from "../step.schema";
import Transition from "../transition.schema";

export default class GrafcetBuilder {
	private _id: string;
	private _name: string;
	private _format: GrafcetFormat;
	private _steps: Step[];
	private _transitions: Transition[];
	private _actions: Action[];
	private _comments: Comment[];
	private _connections: Connection[];
	private _stepsReferralsSources: StepReferralSource[];
	private _stepsReferralsTargets: StepReferralTarget[];
	private _junctionsAndStarts: JunctionAndStart[];
	private _junctionsAndEnds: JunctionAndEnd[];
	private _junctionsOrStarts: JunctionOrStart[];
	private _junctionsOrEnds: JunctionOrEnd[];

	constructor() {
		this._id = "";
		this._name = DEFAULT_GRAFCET_NAME;
		this._format = DEFAULT_GRAFCET_FORMAT;
		this._steps = [];
		this._transitions = [];
		this._actions = [];
		this._comments = [];
		this._connections = [];
		this._stepsReferralsSources = [];
		this._stepsReferralsTargets = [];
		this._junctionsAndStarts = [];
		this._junctionsAndEnds = [];
		this._junctionsOrStarts = [];
		this._junctionsOrEnds = [];
	}

	id(id: string): GrafcetBuilder {
		this._id = id;
		return this;
	}

	name(name: string): GrafcetBuilder {
		this._name = name;
		return this;
	}

	format(format: GrafcetFormat): GrafcetBuilder {
		this._format = format;
		return this;
	}

	addStep(step: Step): GrafcetBuilder {
		this._steps.push(step);
		return this;
	}

	addSteps(...steps: Step[]): GrafcetBuilder {
		this._steps.push(...steps);
		return this;
	}

	addTransition(transition: Transition): GrafcetBuilder {
		this._transitions.push(transition);
		return this;
	}

	addTransitions(...transitions: Transition[]): GrafcetBuilder {
		this._transitions.push(...transitions);
		return this;
	}

	addAction(action: Action): GrafcetBuilder {
		this._actions.push(action);
		return this;
	}

	addActions(...actions: Action[]): GrafcetBuilder {
		this._actions.push(...actions);
		return this;
	}

	addComment(comment: Comment): GrafcetBuilder {
		this._comments.push(comment);
		return this;
	}

	addComments(...comments: Comment[]): GrafcetBuilder {
		this._comments.push(...comments);
		return this;
	}

	addConnection(connection: Connection): GrafcetBuilder {
		this._connections.push(connection);
		return this;
	}

	addConnections(...connections: Connection[]): GrafcetBuilder {
		this._connections.push(...connections);
		return this;
	}

	addStepReferralSource(stepReferral: StepReferralSource): GrafcetBuilder {
		this._stepsReferralsSources.push(stepReferral);
		return this;
	}

	addStepReferralsSources(...stepReferrals: StepReferralSource[]): GrafcetBuilder {
		this._stepsReferralsSources.push(...stepReferrals);
		return this;
	}

	addStepReferralTarget(stepReferral: StepReferralTarget): GrafcetBuilder {
		this._stepsReferralsTargets.push(stepReferral);
		return this;
	}

	addStepReferralsTargets(...stepReferrals: StepReferralTarget[]): GrafcetBuilder {
		this._stepsReferralsTargets.push(...stepReferrals);
		return this;
	}

	addJunctionAndStart(junction: JunctionAndStart): GrafcetBuilder {
		this._junctionsAndStarts.push(junction);
		return this;
	}

	addJunctionsAndStarts(...junctions: JunctionAndStart[]): GrafcetBuilder {
		this._junctionsAndStarts.push(...junctions);
		return this;
	}

	addJunctionAndEnd(junction: JunctionAndEnd): GrafcetBuilder {
		this._junctionsAndEnds.push(junction);
		return this;
	}

	addJunctionsAndEnds(...junctions: JunctionAndEnd[]): GrafcetBuilder {
		this._junctionsAndEnds.push(...junctions);
		return this;
	}

	addJunctionOrStart(junction: JunctionOrStart): GrafcetBuilder {
		this._junctionsOrStarts.push(junction);
		return this;
	}

	addJunctionsOrStarts(...junctions: JunctionOrStart[]): GrafcetBuilder {
		this._junctionsOrStarts.push(...junctions);
		return this;
	}

	addJunctionOrEnd(junction: JunctionOrEnd): GrafcetBuilder {
		this._junctionsOrEnds.push(junction);
		return this;
	}

	addJunctionsOrEnds(...junctions: JunctionOrEnd[]): GrafcetBuilder {
		this._junctionsOrEnds.push(...junctions);
		return this;
	}

	build(): Grafcet {
		const grafcet = new Grafcet(this._id, this._name, this._format);
		grafcet.steps = [...this._steps];
		grafcet.transitions = [...this._transitions];
		grafcet.actions = [...this._actions];
		grafcet.comments = [...this._comments];
		grafcet.connections = [...this._connections];
		grafcet.stepsReferralsSources = [...this._stepsReferralsSources];
		grafcet.stepsReferralsTargets = [...this._stepsReferralsTargets];
		grafcet.junctionsAndStarts = [...this._junctionsAndStarts];
		grafcet.junctionsAndEnds = [...this._junctionsAndEnds];
		grafcet.junctionsOrStarts = [...this._junctionsOrStarts];
		grafcet.junctionsOrEnds = [...this._junctionsOrEnds];
		return grafcet;
	}
}
