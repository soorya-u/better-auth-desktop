import { generateRandomString } from "better-auth/crypto";

export const LOOPBACK_HOST = "127.0.0.1";

export type AllowedLoopbackPorts = number[] | { min: number; max: number };

export function generateNonce(): string {
	return generateRandomString(24, "a-z", "A-Z", "0-9");
}

export function buildLoopbackUrl(
	port: number,
	path: string,
	nonce: string,
): string {
	const url = new URL(`http://${LOOPBACK_HOST}:${port}`);
	url.pathname = path.startsWith("/") ? path : `/${path}`;
	url.searchParams.set("nonce", nonce);
	return url.toString();
}

/**
 * Returns `null` for anything other than a plain-http `127.0.0.1` URL so
 * callers can safely reject untrusted redirect targets (never `localhost`, never https).
 */
export function parseLoopbackUrl(
	raw: string,
	allowedPorts?: AllowedLoopbackPorts,
): URL | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}
	if (url.protocol !== "http:") return null;
	if (url.hostname !== LOOPBACK_HOST) return null;
	const port = Number(url.port);
	if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
	if (allowedPorts && !isAllowedLoopbackPort(port, allowedPorts)) return null;
	return url;
}

export function isAllowedLoopbackPort(
	port: number,
	allowed: AllowedLoopbackPorts,
): boolean {
	if (Array.isArray(allowed)) return allowed.includes(port);
	return port >= allowed.min && port <= allowed.max;
}
