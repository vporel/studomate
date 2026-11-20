import type { Locale } from "@/i18n/config";
import type { TemplateContent } from "./template-content.types";

import frCommon from "./fr/common.json";
import frPreferences from "./fr/preferences.json";
import frAnalysisIssues from "./fr/analysisIssues.json";
import frExpressionErrors from "./fr/expressionErrors.json";
import frTemplates from "./fr/templates.json";
import frTemplateContent from "./fr/template-content";
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
import frTraining from "./fr/training.json";
import frVariableValidation from "./fr/variableValidation.json";
import frCrossReference from "./fr/crossReference.json";
import frVariableSelectorMenu from "./fr/variableSelectorMenu.json";
import frProfile from "./fr/profile.json";
import frTour from "./fr/tour.json";
import frScene3d from "./fr/scene3d.json";
import frGlossary from "./fr/glossary.json";
import frEmbedded from "./fr/embedded.json";
import frFeedback from "./fr/feedback.json";
import frWhatsNew from "./fr/whatsNew.json";
import enCommon from "./en/common.json";
import enPreferences from "./en/preferences.json";
import enAnalysisIssues from "./en/analysisIssues.json";
import enExpressionErrors from "./en/expressionErrors.json";
import enTemplates from "./en/templates.json";
import enTemplateContent from "./en/template-content";
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
import enTraining from "./en/training.json";
import enVariableValidation from "./en/variableValidation.json";
import enCrossReference from "./en/crossReference.json";
import enVariableSelectorMenu from "./en/variableSelectorMenu.json";
import enProfile from "./en/profile.json";
import enTour from "./en/tour.json";
import enScene3d from "./en/scene3d.json";
import enGlossary from "./en/glossary.json";
import enEmbedded from "./en/embedded.json";
import enFeedback from "./en/feedback.json";
import enWhatsNew from "./en/whatsNew.json";
import esCommon from "./es/common.json";
import esPreferences from "./es/preferences.json";
import esAnalysisIssues from "./es/analysisIssues.json";
import esExpressionErrors from "./es/expressionErrors.json";
import esTemplates from "./es/templates.json";
import esTemplateContent from "./es/template-content";
import esMenu from "./es/menu.json";
import esAuth from "./es/auth.json";
import esExplorer from "./es/explorer.json";
import esPages from "./es/pages.json";
import esGrafcetEditor from "./es/grafcetEditor.json";
import esLadderEditor from "./es/ladderEditor.json";
import esHmiEditor from "./es/hmiEditor.json";
import esToasts from "./es/toasts.json";
import esProjects from "./es/projects.json";
import esShortcuts from "./es/shortcuts.json";
import esChrome from "./es/chrome.json";
import esPublic from "./es/public.json";
import esManual from "./es/manual.json";
import esTraining from "./es/training.json";
import esVariableValidation from "./es/variableValidation.json";
import esCrossReference from "./es/crossReference.json";
import esVariableSelectorMenu from "./es/variableSelectorMenu.json";
import esProfile from "./es/profile.json";
import esTour from "./es/tour.json";
import esScene3d from "./es/scene3d.json";
import esGlossary from "./es/glossary.json";
import esEmbedded from "./es/embedded.json";
import esFeedback from "./es/feedback.json";
import esWhatsNew from "./es/whatsNew.json";

export type Messages = {
	common: typeof frCommon;
	preferences: typeof frPreferences;
	analysisIssues: typeof frAnalysisIssues;
	expressionErrors: typeof frExpressionErrors;
	templates: typeof frTemplates;
	templateContent: Record<string, TemplateContent>;
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
	training: typeof frTraining;
	variableValidation: typeof frVariableValidation;
	crossReference: typeof frCrossReference;
	variableSelectorMenu: typeof frVariableSelectorMenu;
	profile: typeof frProfile;
	tour: typeof frTour;
	scene3d: typeof frScene3d;
	glossary: typeof frGlossary;
	embedded: typeof frEmbedded;
	feedback: typeof frFeedback;
	whatsNew: typeof frWhatsNew;
};

const MESSAGES: Record<Locale, Messages> = {
	fr: {
		common: frCommon,
		preferences: frPreferences,
		analysisIssues: frAnalysisIssues,
		expressionErrors: frExpressionErrors,
		templates: frTemplates,
		templateContent: frTemplateContent,
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
		training: frTraining,
		variableValidation: frVariableValidation,
		crossReference: frCrossReference,
		variableSelectorMenu: frVariableSelectorMenu,
		profile: frProfile,
		tour: frTour,
		scene3d: frScene3d,
		glossary: frGlossary,
		embedded: frEmbedded,
		feedback: frFeedback,
		whatsNew: frWhatsNew,
	},
	en: {
		common: enCommon,
		preferences: enPreferences,
		analysisIssues: enAnalysisIssues,
		expressionErrors: enExpressionErrors,
		templates: enTemplates,
		templateContent: enTemplateContent,
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
		training: enTraining,
		variableValidation: enVariableValidation,
		crossReference: enCrossReference,
		variableSelectorMenu: enVariableSelectorMenu,
		profile: enProfile,
		tour: enTour,
		scene3d: enScene3d,
		glossary: enGlossary,
		embedded: enEmbedded,
		feedback: enFeedback,
		whatsNew: enWhatsNew,
	},
	es: {
		common: esCommon,
		preferences: esPreferences,
		analysisIssues: esAnalysisIssues,
		expressionErrors: esExpressionErrors,
		templates: esTemplates,
		templateContent: esTemplateContent,
		menu: esMenu,
		auth: esAuth,
		explorer: esExplorer,
		pages: esPages,
		grafcetEditor: esGrafcetEditor,
		ladderEditor: esLadderEditor,
		hmiEditor: esHmiEditor,
		toasts: esToasts,
		projects: esProjects,
		shortcuts: esShortcuts,
		chrome: esChrome,
		public: esPublic,
		manual: esManual,
		training: esTraining,
		variableValidation: esVariableValidation,
		crossReference: esCrossReference,
		variableSelectorMenu: esVariableSelectorMenu,
		profile: esProfile,
		tour: esTour,
		scene3d: esScene3d,
		glossary: esGlossary,
		embedded: esEmbedded,
		feedback: esFeedback,
		whatsNew: esWhatsNew,
	},
};

export function getMessages(locale: Locale): Messages {
	return MESSAGES[locale];
}
