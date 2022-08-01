import { Command } from 'clipanion';
import { promises as fs } from 'fs';
import { getConfig } from '../Config.js';

export class GetListCommand extends Command {
	static paths = [['get-list']];

	async execute(): Promise<number> {
		const { roots } = await getConfig();

		if (!roots?.length) {
			this.context.stderr.write(
				`Please set up a project root using:\n\n\t${this.cli.format().code('pdm root add /path/to/projects')}\n`
			);
			return 1;
		}

		try {
			const projectNames = [];
			for (const root of roots) {
				const dirContents = await fs.readdir(root.path, { withFileTypes: true });
				projectNames.push(
					...dirContents.filter(entry => entry.isDirectory()).map(entry => `${root.name}:${entry.name}`)
				);
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
