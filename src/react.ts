import { useEffect, useState } from "react";
import type { AuthUser } from "./core/types";
import type { AuthBridges } from "./rpc/schema";

/** React hook that subscribes to the desktop bridge user session. Must be called from a component or another hook. */
export function useSession<TUser extends AuthUser = AuthUser>(
	bridge: AuthBridges<TUser> | null,
): { data: { user: TUser } | null; isPending: boolean; error: unknown } {
	const [data, setData] = useState<{ user: TUser } | null>(null);
	const [isPending, setIsPending] = useState(true);

	useEffect(() => {
		if (!bridge) {
			setIsPending(false);
			return;
		}

		let settled = false;
		const settle = (user: TUser | null) => {
			if (!settled) {
				settled = true;
				setIsPending(false);
			}
			setData(user ? { user } : null);
		};

		return bridge.watchUser(settle);
	}, [bridge]);

	return { data, isPending, error: null };
}
