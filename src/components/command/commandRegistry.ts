import type { StartPageUser } from "@/app/startPage";

// Command bar registry (retail plan §7.12). Features register commands at module load; the bar
// shows the ones this user may see.

export interface CommandContext {
  navigate: (opts: { to: string; search?: Record<string, unknown> }) => unknown;
  /** Opens an overlay by id (after the command bar has closed). */
  openOverlay: (id: string, props?: Record<string, any>) => void;
}

export interface CommandDef {
  id: string;
  /** i18n key for the visible name. */
  label: string;
  /** Extra words that should find this command (already lower-case, any language). */
  keywords?: string[];
  /** Id of a shortcut in shortcuts.ts, shown as a hint. */
  shortcut?: string;
  /** Permission the user needs (admin roles pass, like the rest of the app). */
  permission?: string;
  /** Plan feature the shop needs. */
  feature?: string;
  /** Extra visibility rule, for pages that already have one (see startPage.canOpenStartPage). */
  visible?: (user: StartPageUser) => boolean;
  perform: (ctx: CommandContext) => unknown;
}

/** A command made up from what was typed, e.g. "Find invoice 1934". */
export interface DynamicCommand {
  id: string;
  /** i18n key and values for the visible name. */
  labelKey: string;
  values?: Record<string, string | number>;
  perform: (ctx: CommandContext) => unknown;
}

export type CommandProvider = (query: string) => DynamicCommand[];

const commands = new Map<string, CommandDef>();
const providers = new Map<string, CommandProvider>();

export function registerCommand(def: CommandDef) {
  commands.set(def.id, def);
  return () => {
    if (commands.get(def.id) === def) commands.delete(def.id);
  };
}

export function registerCommandProvider(id: string, provider: CommandProvider) {
  providers.set(id, provider);
  return () => {
    providers.delete(id);
  };
}

export const listCommands = () => Array.from(commands.values());
export const runProviders = (query: string): DynamicCommand[] =>
  Array.from(providers.values()).flatMap((p) => p(query));
