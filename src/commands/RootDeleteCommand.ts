import { Command, Option } from 'clipanion';
import { getConfig, migrateConfig, writeConfig } from '../Config.js';

export class RootDeleteCommand extends Command {
	static paths = [['root', 'delete']];

	static usage = Command.Usage({
		description: 'delete a project root',
		details: `
			Deletes a project root.
		`,
		examples: [['Delete a project root', 'pdm root delete legacy']]
	});

	name = Option.String({ name: 'name', required: true });

	async execute(): Promise<number> {
		await migrateConfig();

		const conf = await getConfig();
		conf.roots ??= [];

		const fmt = this.cli.format(true);

		const targetRootIndex = conf.roots.findIndex(root => root.name === this.name);

		if (!targetRootIndex) {
			this.context.stdout.write(
				`There is no project root with the name ${fmt.code(this.name)}.\nPlease choose an existing name.\n`
			);

			return 1;
		}

		conf.roots.splice(targetRootIndex, 1);

		await writeConfig(conf);

		return 0;
	}
}
