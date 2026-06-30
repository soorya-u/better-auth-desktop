import type { BetterFetchError } from "@better-fetch/fetch";
import { Electroview } from "electrobun/view";
import type { AuthUser, RequestAuthOptions } from "../core/types";
import type { AuthBridges, DesktopAuthRPC } from "./schema";

/** Initializes the Electrobun webview RPC and returns the desktop bridge. */
export function defineAuthWebviewRPC<
	TUser extends AuthUser = AuthUser,
>(): AuthBridges<TUser> {
	const rpc = Electroview.defineRPC<DesktopAuthRPC>({
		maxRequestTime: 30_000,
		handlers: { requests: {}, messages: {} },
	});

	new Electroview({ rpc });

	const teardowns = new Set<() => void>();

	const track = (off: () => void): (() => void) => {
		teardowns.add(off);
		return () => {
			off();
			teardowns.delete(off);
		};
	};

	return {
		getUser: () => rpc.request.getUser({}) as Promise<TUser | null>,

		getSession: () =>
			(rpc.request.getUser({}) as Promise<TUser | null>)
				.then((user) => ({ data: user ? { user } : null, error: null }))
				.catch((error: unknown) => ({ data: null, error })),

		watchUser: (callback: (user: TUser | null) => void): (() => void) => {
			let disposed = false;
			let sawEvent = false;

			const apply = (user: TUser | null) => {
				sawEvent = true;
				if (!disposed) callback(user);
			};

			const authHandler = (user: TUser) => apply(user);
			const updateHandler = (user: TUser | null) => apply(user);

			rpc.addMessageListener(
				"onAuthenticated",
				authHandler as unknown as (user: AuthUser) => void,
			);
			rpc.addMessageListener(
				"onUserUpdated",
				updateHandler as unknown as (user: AuthUser | null) => void,
			);

			(rpc.request.getUser({}) as Promise<TUser | null>)
				.then((user) => {
					if (!disposed && !sawEvent) callback(user);
				})
				.catch(() => {
					if (!disposed && !sawEvent) callback(null);
				});

			const cleanup = () => {
				disposed = true;
				rpc.removeMessageListener(
					"onAuthenticated",
					authHandler as unknown as (user: AuthUser) => void,
				);
				rpc.removeMessageListener(
					"onUserUpdated",
					updateHandler as unknown as (user: AuthUser | null) => void,
				);
				teardowns.delete(cleanup);
			};
			teardowns.add(cleanup);
			return cleanup;
		},

		requestAuth: (options: RequestAuthOptions) =>
			rpc.request.requestAuth({ options }),

		getAuthUrl: (options: RequestAuthOptions) =>
			rpc.request.getAuthUrl({ options }),

		signOut: () => rpc.request.signOut({}),

		getUserImage: (url: string) => rpc.request.getUserImage({ url }),

		onAuthenticated: (callback: (user: TUser) => void): (() => void) => {
			const handler = (user: TUser) => callback(user);
			rpc.addMessageListener(
				"onAuthenticated",
				handler as unknown as (user: AuthUser) => void,
			);
			return track(() =>
				rpc.removeMessageListener(
					"onAuthenticated",
					handler as unknown as (user: AuthUser) => void,
				),
			);
		},

		onUserUpdated: (callback: (user: TUser | null) => void): (() => void) => {
			const handler = (user: TUser | null) => callback(user);
			rpc.addMessageListener(
				"onUserUpdated",
				handler as unknown as (user: AuthUser | null) => void,
			);
			return track(() =>
				rpc.removeMessageListener(
					"onUserUpdated",
					handler as unknown as (user: AuthUser | null) => void,
				),
			);
		},

		onAuthError: (
			callback: (context: {
				error: BetterFetchError | { message: string };
				path?: string;
			}) => void,
		): (() => void) => {
			const handler = (ctx: Parameters<typeof callback>[0]) => callback(ctx);
			rpc.addMessageListener("onAuthError", handler);
			return track(() => rpc.removeMessageListener("onAuthError", handler));
		},

		destroy: () => {
			for (const off of teardowns) off();
			teardowns.clear();
		},
	};
}
