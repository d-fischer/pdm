import { Command, Option } from 'clipanion';
import { promises as fs } from 'fs';
import path from 'path';
import prompts from 'prompts';
import { getConfig } from '../Config.js';

export class GetPathCommand extends Command {
	static paths = [['get-path']];
	project = Option.String({ name: 'project', required: false });

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

		// temp
		if (this.project == null) {
			this.context.stdout.write(projectRoot);
			return 0;
		}

		try {
			const dirContents = await fs.readdir(projectRoot, { withFileTypes: true });

			const projectNames = dirContents.filter(entry => entry.isDirectory()).map(entry => entry.name);

			// exact match
			if (projectNames.includes(this.project)) {
				this.context.stdout.write(path.join(projectRoot, this.project));
				return 0;
			}

			// partial matches
			const results = projectNames.filter(name => name.includes(this.project!));

			if (results.length === 0) {
				this.context.stderr.write(
					`Could not find a match for the project name ${this.cli.format().code(this.project)}.`
				);
				return 1;
			}

			if (results.length === 1) {
				this.context.stdout.write(path.join(projectRoot, results[0]));
				return 0;
			}

			try {
				const { projectToReturn } = (await prompts({
					name: 'projectToReturn',
					type: 'select',
					message: 'The input is ambiguous, please choose the correct project you want to go to',
					choices: results.map(result => ({ title: result, value: result })),
					stdout: this.context.stderr
				})) as { projectToReturn?: string };

				if (!projectToReturn) {
					return 1;
				}

				this.context.stdout.write(path.join(projectRoot, projectToReturn));
				return 0;
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e);
				return 1;
			}
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
