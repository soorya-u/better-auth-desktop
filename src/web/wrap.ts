import type { AuthUser } from "../core/types";
import type { AuthBridges, SessionResult } from "../rpc/schema";

/**
 * Session hook compatible with {@link wrapForDesktop}'s third parameter.
 * Use this to type a custom framework hook (Vue, Svelte, etc.) before passing it in.
 */
export type UseSessionFn<TUser extends AuthUser = AuthUser> = (
	bridge: AuthBridges<TUser> | null,
) => { data: { user: TUser } | null; isPending: boolean; error: unknown };

/**
 * Proxy-wraps a better-auth client so that `getSession`, `signOut`, and
 * `signIn.social` are delegated to the desktop bridge. Pass an optional
 * `useSessionFn` to also intercept `useSession`. Returns `base` unchanged
 * when `bridge` is `null`.
 */
export function wrapForDesktop<
	T extends object,
	TUser extends AuthUser = AuthUser,
>(
	base: T,
	bridge: AuthBridges<TUser> | null,
	useSessionFn?: UseSessionFn<TUser>,
): T {
	if (!bridge) return base;

	return new Proxy(base, {
		get(target, prop, receiver) {
			if (prop === "useSession") {
				if (useSessionFn) return () => useSessionFn(bridge);
				return Reflect.get(target, prop, receiver);
			}

			if (prop === "getSession") {
				return (): Promise<SessionResult<TUser>> => bridge.getSession();
			}

			if (prop === "signOut") {
				return () => bridge.signOut();
			}

			if (prop !== "signIn") {
				return Reflect.get(target, prop, receiver);
			}

			const signIn = Reflect.get(target, prop, receiver) as object;
			return new Proxy(signIn, {
				get(signInTarget, signInProp, signInReceiver) {
					if (signInProp !== "social") {
						return Reflect.get(signInTarget, signInProp, signInReceiver);
					}
					return (params: {
						provider: string;
						disableRedirect?: boolean;
						[key: string]: unknown;
					}) => {
						const { disableRedirect, ...rest } = params;
						if (disableRedirect) {
							// Return the desktop init-oauth-proxy URL without opening a browser,
							// shaped like the better-auth client envelope so callers can read .data.url.
							return bridge.getAuthUrl(rest).then((url) => ({
								data: { url, redirect: false },
								error: null,
							}));
						}
						return bridge.requestAuth(rest);
					};
				},
			});
		},
	});
}
