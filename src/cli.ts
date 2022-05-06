import { Builtins, runExit } from 'clipanion';
import type { RunCommandNoContext } from 'clipanion/lib/advanced/Cli';
import { ConfigCommand } from './commands/ConfigCommand.js';
import { GetListCommand } from './commands/GetListCommand.js';
import { GetPathCommand } from './commands/GetPathCommand.js';
import { InstallCommand } from './commands/InstallCommand.js';

export async function pdm(): Promise<void> {
	await runExit({ binaryName: 'pdm' }, [
		Builtins.HelpCommand,
		ConfigCommand,
		InstallCommand,
		GetListCommand,
		GetPathCommand
	] as RunCommandNoContext);
}
