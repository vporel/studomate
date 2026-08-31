/*
Studomate — outil pédagogique d'automatisme (GRAFCET, Ladder, HMI)
Copyright (C) 2026 vporel

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Identité de l'application.
 *
 * Module neutre, sans aucune dépendance : il est lu aussi bien par l'interface que par le
 * domaine (`Project` estampille la version qui l'a créé).
 */
export const APP_NAME = "Studomate";
export const APP_SLOGAN = "Créer, Simuler, Automatiser";
export const APP_SHORT_DESCRIPTION =
	"Concevez et simulez GRAFCET, Ladder et HMI animées dans le même navigateur — sans installation, sans compte.";
export const APP_REPO_URL = "https://github.com/vporel/studomate";
export const APP_CONTACT_EMAIL = "dev.vporel@gmail.com";

/**
 * URL publique de production. Sert de repli au `metadataBase` et de base aux URLs
 * absolues du `robots` / `sitemap` quand `NEXT_PUBLIC_SITE_URL` n'est pas défini.
 */
export const APP_URL = "https://studomate.com";
