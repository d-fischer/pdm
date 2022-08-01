import { Command, Option } from 'clipanion';
import { promises as fs } from 'fs';
import path from 'path';
import prompts from 'prompts';
import type { ProjectRoot } from '../Config.js';
import { getConfig, migrateConfig } from '../Config.js';

interface ResultMatch {
	rootName: string;
	name: string;
	path: string;
	exact: boolean;
}

async function findInRoot(root: ProjectRoot, search: string): Promise<ResultMatch[]> {
	const dirContents = await fs.readdir(root.path, { withFileTypes: true });

	const projectNames = dirContents.filter(entry => entry.isDirectory()).map(entry => entry.name);

	if (projectNames.includes(search)) {
		return [
			{
				rootName: root.name,
				name: search,
				path: path.join(root.path, search),
				exact: true
			}
		];
	}

	const results = projectNames.filter(name => name.includes(search));

	return results.map(project => ({
		rootName: root.name,
		name: project,
		path: path.join(root.path, project),
		exact: false
	}));
}

export class GetPathCommand extends Command {
	static paths = [['get-path']];
	project = Option.String({ name: 'project', required: false });

	async execute(): Promise<number> {
		await migrateConfig();
		const { roots } = await getConfig();

		const fmt = this.cli.format();
		if (!roots?.length) {
			this.context.stderr.write(
				`Please set up a project root using:\n\n\t${fmt.code('pdm root add /path/to/projects')}\n`
			);
			return 1;
		}

		try {
			const projectSearch = this.project ?? '';
			let [rootName, projectName] = projectSearch.split(':') as [string | undefined, string | undefined];

			if (!projectName) {
				projectName = rootName!;
				rootName = undefined;
			}

			if (rootName) {
				const root = roots.find(rt => rt.name === rootName);
				if (!root) {
					this.context.stderr.write(`There is no project root called ${fmt.code(rootName)}.\n`);
					return 1;
				}
				const matches = await findInRoot(root, projectName);

				if (matches.length === 0) {
					this.context.stderr.write(
						`Could not find a match for the project name ${fmt.code(projectSearch)}.\n`
					);
					return 1;
				}

				if (matches.length === 1) {
					this.context.stdout.write(matches[0].path);
					return 0;
				}

				try {
					const { projectToReturn } = (await prompts({
						name: 'projectToReturn',
						type: 'select',
						message: 'The input is ambiguous, please choose the correct project you want to go to',
						choices: matches.map(result => ({ title: `${result.rootName}:${result.name}`, value: result })),
						stdout: this.context.stderr
					})) as { projectToReturn?: ResultMatch };

					if (!projectToReturn) {
						return 1;
					}

					this.context.stdout.write(projectToReturn.path);
					return 0;
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(e);
					return 1;
				}
			}

			const results = (await Promise.all(roots.map(async root => await findInRoot(root, projectName!)))).flat(1);

			let resultsToShow = results.filter(result => result.exact);

			if (!resultsToShow.length) {
				resultsToShow = results;
			}

			if (resultsToShow.length === 0) {
				this.context.stderr.write(`Could not find a match for the project name ${fmt.code(projectSearch)}.\n`);
				return 1;
			}

			if (resultsToShow.length === 1) {
				this.context.stdout.write(resultsToShow[0].path);
				return 0;
			}

			try {
				const { projectToReturn } = (await prompts({
					name: 'projectToReturn',
					type: 'select',
					message: 'The input is ambiguous, please choose the correct project you want to go to',
					choices: results.map(result => ({ title: `${result.rootName}:${result.name}`, value: result })),
					stdout: this.context.stderr
				})) as { projectToReturn?: ResultMatch };

				if (!projectToReturn) {
					return 1;
				}

				this.context.stdout.write(projectToReturn.path);
				return 0;
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e);
				return 1;
			}
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
