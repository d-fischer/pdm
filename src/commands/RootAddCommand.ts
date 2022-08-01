import { Command, Option } from 'clipanion';
import path from 'path';
import { promises as fs } from 'fs';
import { getConfig, migrateConfig, writeConfig } from '../Config.js';

export class RootAddCommand extends Command {
	static paths = [['root', 'add']];

	static usage = Command.Usage({
		description: 'add a project root',
		details: `
			Adds a project root.
		`,
		examples: [
			['Add a project root with the automatically deduced name "projects"', 'pdm root add ~/projects'],
			['Add a project root with a custom name', 'pdm root add ~/projects --name main']
		]
	});

	rootPath = Option.String({ name: 'path', required: true });
	rootName = Option.String('--name');

	async execute(): Promise<number> {
		await migrateConfig();

		const conf = await getConfig();
		conf.roots ??= [];

		const cleanPath = this.rootPath.replace(/\/$/, '');
		const name = this.rootName ?? path.basename(cleanPath);

		const fmt = this.cli.format(true);
		if (conf.roots.some(root => root.name === name)) {
			this.context.stdout.write(
				`There is already a project root with the name ${fmt.code(name)}.\nPlease choose another name.\n`
			);

			return 1;
		}

		if (conf.roots.some(root => root.path === cleanPath)) {
			this.context.stdout.write(`You already added the path ${fmt.code(cleanPath)} as project root.\n`);

			return 1;
		}

		try {
			const folderStat = await fs.stat(cleanPath);

			if (!folderStat.isDirectory()) {
				this.context.stderr.write(`The file ${fmt.code(cleanPath)} is not a directory!\n`);
				return 1;
			}
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
				this.context.stderr.write(`The directory ${fmt.code(cleanPath)} does not exist!\n`);
				return 1;
			}

			throw e;
		}

		conf.roots.push({
			path: this.rootPath,
			name
		});

		await writeConfig(conf);

		return 0;
	}
}
