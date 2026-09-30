// Único origen registrado en Google Cloud Console como Authorized JavaScript Origin
// (junto con localhost). Los previews de PR delegan el login acá y reciben el token de vuelta.
export const CENTRAL_AUTH_URL = "https://victorious-mushroom-0cd000a10.5.azurestaticapps.net";

// Hosts de este Static Web App. Produccion es victorious-mushroom-0cd000a10.5.azurestaticapps.net
// y los previews victorious-mushroom-0cd000a10-<PR>.<region>.5.azurestaticapps.net: Azure intercala
// uno o mas segmentos (region, numero de escala) que pueden cambiar, asi que se aceptan todos
// mientras el prefijo del app y el dominio azurestaticapps.net sean exactos.
const SWA_HOST = /^victorious-mushroom-0cd000a10(-\d+)?(\.[a-z0-9-]+)*\.azurestaticapps\.net$/;

function isLocalhost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

// Si el origen actual está registrado en Google, el login se hace acá mismo.
export function isAuthorizedOrigin(): boolean {
    const { origin, hostname } = window.location;
    return origin === CENTRAL_AUTH_URL || isLocalhost(hostname);
}

// El dominio central devuelve el id_token como query param, así que sólo puede reenviarlo
// a los previews de este mismo SWA: sin esta validación, ?returnTo=https://... filtra el token.
export function isAllowedReturnUrl(raw: string): boolean {
    try {
        const url = new URL(raw);
        if (isLocalhost(url.hostname)) return url.protocol === 'http:' || url.protocol === 'https:';
        return url.protocol === 'https:' && SWA_HOST.test(url.hostname);
    } catch {
        return false;
    }
}
