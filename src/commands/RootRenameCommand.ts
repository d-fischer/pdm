import { Command, Option } from 'clipanion';
import { getConfig, migrateConfig, writeConfig } from '../Config.js';

export class RootRenameCommand extends Command {
	static paths = [['root', 'rename']];

	static usage = Command.Usage({
		description: 'rename a project root',
		details: `
			Renames a project root.
		`,
		examples: [['Rename a project root', 'pdm root rename legacy oss']]
	});

	currentName = Option.String({ name: 'current-name', required: true });
	newName = Option.String({ name: 'new-name', required: true });

	async execute(): Promise<number> {
		await migrateConfig();

		const conf = await getConfig();
		conf.roots ??= [];

		const fmt = this.cli.format(true);

		const targetRoot = conf.roots.find(root => root.name === this.currentName);

		if (!targetRoot) {
			this.context.stdout.write(
				`There is no project root with the name ${fmt.code(
					this.currentName
				)}.\nPlease choose an existing name.\n`
			);

			return 1;
		}

		const hasConflictingRoot = conf.roots.some(root => root.name === this.newName);

		if (hasConflictingRoot) {
			this.context.stdout.write(
				`There is already a project root with the name ${fmt.code(
					this.newName
				)}.\nPlease choose another name or rename the other one first.\n`
			);

			return 1;
		}

		targetRoot.name = this.newName;

		await writeConfig(conf);

		return 0;
	}
}
