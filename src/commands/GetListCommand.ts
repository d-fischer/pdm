import { Command } from 'clipanion';
import { promises as fs } from 'fs';
import { getConfig } from '../Config.js';

export class GetListCommand extends Command {
	static paths = [['get-list']];

	async execute(): Promise<number> {
		const { projectRoot } = await getConfig();

		if (projectRoot == null) {
			this.context.stderr.write(
				`Please set up a project root using:\n\n\t${this.cli
					.format()
					.code('pdm set project-root /path/to/projects')}\n`
			);
			return 1;
		}

		try {
			const dirContents = await fs.readdir(projectRoot, { withFileTypes: true });
			const projectNames = dirContents.filter(entry => entry.isDirectory()).map(entry => entry.name);

			this.context.stdout.write(projectNames.join('\n'));

			return 0;
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
				this.context.stderr.write(
					`Please set up a project root using:\n\n\t${this.cli
						.format()
						.code('pdm set project-root /path/to/projects')}\n`
				);
				return 1;
			}

			throw e;
		}
	}
}
