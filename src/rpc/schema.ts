import type { User } from "@better-auth/core/db";
import type { BetterFetchError } from "@better-fetch/fetch";
import type { AuthUser, RequestAuthOptions } from "../core/types";

export type RPCSchema<
	T extends { requests?: any; messages?: any } | undefined = undefined,
> = [T] extends [undefined]
	? { requests: Record<string, any>; messages: Record<string, any> }
	: NonNullable<T>;

export type DesktopRPCSchema = {
	bun: RPCSchema;
	webview: RPCSchema;
};

export type AuthBunRequests = {
	getUser: {
		params: Record<never, never>;
		response: (User & Record<string, any>) | null;
	};
	requestAuth: {
		params: { options: RequestAuthOptions };
		response: undefined;
	};
	getAuthUrl: {
		params: { options: RequestAuthOptions };
		response: string;
	};
	signOut: {
		params: Record<never, never>;
		response: undefined;
	};
	getUserImage: {
		params: { url: string };
		response: { dataUrl: string | null };
	};
};

export type AuthWebviewMessages = {
	onAuthenticated: User & Record<string, any>;
	onUserUpdated: (User & Record<string, any>) | null;
	onAuthError: {
		error: BetterFetchError | { message: string };
		path?: string;
	};
};

export type DesktopAuthRPC = DesktopRPCSchema & {
	bun: {
		requests: AuthBunRequests;
		messages: Record<never, never>;
	};
	webview: {
		requests: Record<never, never>;
		messages: AuthWebviewMessages;
	};
};

export type SessionResult<TUser> = {
	data: { user: TUser } | null;
	error: unknown;
};

export type AuthBridges<TUser extends AuthUser = AuthUser> = {
	getUser(): Promise<TUser | null>;
	// Returns the better-auth client envelope shape { data: { user } | null, error }.
	getSession(): Promise<SessionResult<TUser>>;
	// Race-safe subscription: fires with the current user immediately, then on every auth event.
	// The initial getUser() result is suppressed if an event fires first.
	watchUser(callback: (user: TUser | null) => void): () => void;
	requestAuth(options: RequestAuthOptions): Promise<void>;
	// Starts the loopback server and returns the init-oauth-proxy URL without
	// opening a browser — use for copy-link flows.
	getAuthUrl(options: RequestAuthOptions): Promise<string>;
	signOut(): Promise<void>;
	getUserImage(url: string): Promise<{ dataUrl: string | null }>;
	onAuthenticated(callback: (user: TUser) => void): () => void;
	onUserUpdated(callback: (user: TUser | null) => void): () => void;
	onAuthError(
		callback: (context: {
			error: BetterFetchError | { message: string };
			path?: string;
		}) => void,
	): () => void;
	// Removes all listeners. Useful on hot reload or window close.
	destroy(): void;
};

export type ExposedBridges<TUser extends AuthUser = AuthUser> =
	AuthBridges<TUser>;
