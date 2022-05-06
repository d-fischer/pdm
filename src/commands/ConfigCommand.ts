import { Command, Option } from 'clipanion';
import { getConfig, writeConfig } from '../Config.js';

export class ConfigCommand extends Command {
	static paths = [['config']];

	static usage = Command.Usage({
		description: 'update a configuration setting',
		details: `
			Update a configuration setting. Currently, the only valid setting is "project-root".
		`,
		examples: [['Set your project root', 'pdm config project-root ~/projects']]
	});

	key = Option.String({ name: 'key', required: true });
	value = Option.String({ name: 'value', required: true });

	async execute(): Promise<void> {
		const config = await getConfig();
		const inputKey = this.key;
		const inputValue = this.value;
		const camelCasedKey = inputKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
		if (camelCasedKey === 'projectRoot') {
			config.projectRoot = inputValue;
			await writeConfig(config);
			this.context.stdout.write(
				`Set the setting ${this.cli.format(true).code(camelCasedKey)} to ${this.cli
					.format(true)
					.code(inputValue)}.\n`
			);
		} else {
			this.context.stdout.write(
				`I don't know any setting called ${this.cli.format(true).code(camelCasedKey)}.\n`
			);
		}
	}
}
