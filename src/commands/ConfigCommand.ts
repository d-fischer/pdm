import { Command, Option } from 'clipanion';
import { getConfig, writeConfig } from '../Config.js';

export class ConfigCommand extends Command {
	static paths = [['config']];

	static usage = Command.Usage({
		description: 'update a configuration setting',
		details: `
			Update a configuration setting. Currently, the only valid setting is "namespace-separator".
		`,
		examples: [['Set your separator to @', 'pdm config namespace-separator @']]
	});

	key = Option.String({ name: 'key', required: true });
	value = Option.String({ name: 'value', required: true });

	async execute(): Promise<void> {
		const config = await getConfig();
		const inputKey = this.key;
		const inputValue = this.value;
		const camelCasedKey = inputKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
		const fmt = this.cli.format();

		if (camelCasedKey === 'namespaceSeparator') {
			config.namespaceSeparator = inputValue;
			await writeConfig(config);
			this.context.stdout.write(`Set the setting ${fmt.code(camelCasedKey)} to ${fmt.code(inputValue)}.\n`);
		} else {
			this.context.stdout.write(`I don't know any setting called ${fmt.code(camelCasedKey)}.\n`);
		}
	}
}
