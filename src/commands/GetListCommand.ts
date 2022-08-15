import { Command, Option } from 'clipanion';
import { promises as fs } from 'fs';
import { getConfig } from '../Config.js';

export class GetListCommand extends Command {
	static paths = [['get-list']];

	shell = Option.String('--shell', {
		description: `
			Specify the shell target to affect output for completion.
		`
	});

	async execute(): Promise<number> {
		const { roots, namespaceSeparator, showAllDirectories } = await getConfig();
		const fmt = this.cli.format();

		if (!roots?.length) {
			this.context.stderr.write(
				`Please set up a project root using:\n\n\t${fmt.code('pdm root add /path/to/projects')}\n`
			);
			return 1;
		}

		switch (this.shell) {
			case undefined:
			case 'bash':
			case 'fish':
			case 'zsh':
				break;
			default:
				this.context.stderr.write('Please specify a known shell: bash, fish, zsh\n');
				return 1;
		}

		try {
			const projectNames = [];
			for (const root of roots) {
				const dirContents = await fs.readdir(root.path, { withFileTypes: true });
				const dirs = dirContents.filter(
					entry => entry.isDirectory() && (showAllDirectories || !entry.name.startsWith('.'))
				);
				projectNames.push(...dirs.map(entry => `${root.name}${namespaceSeparator ?? ':'}${entry.name}`));
				if (this.shell === 'bash') {
					projectNames.push(...dirs.map(entry => entry.name));
				}
			}

			this.context.stdout.write(projectNames.join('\n'));
			return 0;
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
				this.context.stderr.write(
					"One of your project root paths doesn't exist anymore! Please investigate!\n"
				);
				return 1;
			}

			throw e;
		}
	}
}
