import { Builtins, Cli } from 'clipanion';
import { ConfigCommand } from './commands/ConfigCommand.js';
import { GetListCommand } from './commands/GetListCommand.js';
import { GetPathCommand } from './commands/GetPathCommand.js';
import { InstallCommand } from './commands/InstallCommand.js';
import { RootAddCommand } from './commands/RootAddCommand.js';
import { RootDeleteCommand } from './commands/RootDeleteCommand.js';
import { RootRenameCommand } from './commands/RootRenameCommand.js';

export async function pdm(): Promise<void> {
	const cli = new Cli({
		binaryName: 'pdm'
	});

	cli.register(Builtins.HelpCommand);
	cli.register(GetListCommand);
	cli.register(GetPathCommand);
	cli.register(InstallCommand);
	cli.register(RootAddCommand);
	cli.register(RootDeleteCommand);
	cli.register(RootRenameCommand);
	cli.register(ConfigCommand);

	await cli.runExit(process.argv.slice(2));
}
