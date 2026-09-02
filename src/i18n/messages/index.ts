import type { Locale } from "@/i18n/config";

import frCommon from "./fr/common.json";
import frPreferences from "./fr/preferences.json";
import frAnalysisIssues from "./fr/analysisIssues.json";
import frExpressionErrors from "./fr/expressionErrors.json";
import frTemplates from "./fr/templates.json";
import frMenu from "./fr/menu.json";
import frAuth from "./fr/auth.json";
import frExplorer from "./fr/explorer.json";
import frPages from "./fr/pages.json";
import frGrafcetEditor from "./fr/grafcetEditor.json";
import frLadderEditor from "./fr/ladderEditor.json";
import frHmiEditor from "./fr/hmiEditor.json";
import frToasts from "./fr/toasts.json";
import frProjects from "./fr/projects.json";
import frShortcuts from "./fr/shortcuts.json";
import frChrome from "./fr/chrome.json";
import frPublic from "./fr/public.json";
import frManual from "./fr/manual.json";
import frVariableValidation from "./fr/variableValidation.json";
import enCommon from "./en/common.json";
import enPreferences from "./en/preferences.json";
import enAnalysisIssues from "./en/analysisIssues.json";
import enExpressionErrors from "./en/expressionErrors.json";
import enTemplates from "./en/templates.json";
import enMenu from "./en/menu.json";
import enAuth from "./en/auth.json";
import enExplorer from "./en/explorer.json";
import enPages from "./en/pages.json";
import enGrafcetEditor from "./en/grafcetEditor.json";
import enLadderEditor from "./en/ladderEditor.json";
import enHmiEditor from "./en/hmiEditor.json";
import enToasts from "./en/toasts.json";
import enProjects from "./en/projects.json";
import enShortcuts from "./en/shortcuts.json";
import enChrome from "./en/chrome.json";
import enPublic from "./en/public.json";
import enManual from "./en/manual.json";
import enVariableValidation from "./en/variableValidation.json";

export type Messages = {
	common: typeof frCommon;
	preferences: typeof frPreferences;
	analysisIssues: typeof frAnalysisIssues;
	expressionErrors: typeof frExpressionErrors;
	templates: typeof frTemplates;
	menu: typeof frMenu;
	auth: typeof frAuth;
	explorer: typeof frExplorer;
	pages: typeof frPages;
	grafcetEditor: typeof frGrafcetEditor;
	ladderEditor: typeof frLadderEditor;
	hmiEditor: typeof frHmiEditor;
	toasts: typeof frToasts;
	projects: typeof frProjects;
	shortcuts: typeof frShortcuts;
	chrome: typeof frChrome;
	public: typeof frPublic;
	manual: typeof frManual;
	variableValidation: typeof frVariableValidation;
};

const MESSAGES: Record<Locale, Messages> = {
	fr: {
		common: frCommon,
		preferences: frPreferences,
		analysisIssues: frAnalysisIssues,
		expressionErrors: frExpressionErrors,
		templates: frTemplates,
		menu: frMenu,
		auth: frAuth,
		explorer: frExplorer,
		pages: frPages,
		grafcetEditor: frGrafcetEditor,
		ladderEditor: frLadderEditor,
		hmiEditor: frHmiEditor,
		toasts: frToasts,
		projects: frProjects,
		shortcuts: frShortcuts,
		chrome: frChrome,
		public: frPublic,
		manual: frManual,
		variableValidation: frVariableValidation,
	},
	en: {
		common: enCommon,
		preferences: enPreferences,
		analysisIssues: enAnalysisIssues,
		expressionErrors: enExpressionErrors,
		templates: enTemplates,
		menu: enMenu,
		auth: enAuth,
		explorer: enExplorer,
		pages: enPages,
		grafcetEditor: enGrafcetEditor,
		ladderEditor: enLadderEditor,
		hmiEditor: enHmiEditor,
		toasts: enToasts,
		projects: enProjects,
		shortcuts: enShortcuts,
		chrome: enChrome,
		public: enPublic,
		manual: enManual,
		variableValidation: enVariableValidation,
	},
};

export function getMessages(locale: Locale): Messages {
	return MESSAGES[locale];
}
