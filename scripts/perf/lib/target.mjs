/**
 * Target safety guard for the load / stress harness.
 *
 * Kept out of `run.mjs` so it can be unit-tested without running a CLI.
 */

export const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"]);

/**
 * Refuse to point an aggressive profile at someone else's server.
 *
 * A `spike` profile is 128 workers; against the production VPS that is a
 * self-inflicted outage, so it has to be requested explicitly.
 *
 * @param {{ target: string, profile: string, forceRemote?: boolean }} args
 * @param {Set<string>} aggressiveProfiles
 */
export function assertSafeTarget(args, aggressiveProfiles) {
  const host = new URL(args.target).hostname;
  const local = LOCAL_HOSTS.has(host) || host.endsWith(".local");
  if (aggressiveProfiles.has(args.profile) && !local && !args.forceRemote) {
    throw new Error(
      `Refusing to run the "${args.profile}" profile against the remote host "${host}".\n` +
        "Run it against localhost, or pass --force-remote (PERF_ALLOW_REMOTE_STRESS=1) if you really mean it.",
    );
  }
  return { host, local };
}
