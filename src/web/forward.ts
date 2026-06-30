import type { BetterAuthClientPlugin } from "@better-auth/core";
import { parseLoopbackUrl } from "../core/loopback";
import { PACKAGE_VERSION } from "../version";

// No DOM lib — declare only the window surface we need.
declare const window:
	| { location: { hash: string; replace: (url: string) => void } }
	| undefined;

export type ForwardToDesktopOptions = {
	// Must match the server plugin's `hashKey`. @default "token"
	hashKey?: string;
};

export type ForwardToDesktopResult =
	| { success: true; error: null }
	| { success: false; error: Error };

/**
 * Reads `#token=…&loopback=…` from the URL fragment and navigates to the
 * desktop loopback URL. Returns `success: false` outside a browser or when
 * the fragment is absent.
 */
export function forwardToDesktop(
	options?: ForwardToDesktopOptions,
): ForwardToDesktopResult {
	if (typeof window === "undefined" || !window) {
		return { success: false, error: new Error("Not running in a browser") };
	}

	const hashKey = options?.hashKey ?? "token";
	const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
	const token = params.get(hashKey);
	const loopback = params.get("loopback");

	if (!token || !loopback) {
		return {
			success: false,
			error: new Error("Missing token or loopback in URL fragment"),
		};
	}

	const target = parseLoopbackUrl(loopback);
	if (!target) {
		return { success: false, error: new Error("Invalid loopback URL") };
	}

	target.searchParams.set(hashKey, token);
	window.location.replace(target.toString());
	return { success: true, error: null };
}

/** Better-auth client plugin that exposes {@link forwardToDesktop} as a client action. */
export const webDesktop = (options?: ForwardToDesktopOptions) =>
	({
		id: "desktop-web",
		version: PACKAGE_VERSION,
		getActions: () => ({
			forwardToDesktop: () => forwardToDesktop(options),
		}),
	}) satisfies BetterAuthClientPlugin;
