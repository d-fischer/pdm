import { Command, Option } from 'clipanion';
import { getConfig, writeConfig } from '../Config.js';

export class ConfigCommand extends Command {
	static paths = [['config']];

	static usage = Command.Usage({
		description: 'update a configuration setting',
		details: `
			Update a configuration setting.

			namespace-separator - Specify the separator between root names and project directories
			show-all-directories - Include project directory names starting with '.'
		`,
		examples: [['Set your separator to @', 'pdm config namespace-separator @']]
	});

	key = Option.String({ name: 'key', required: true });
	value = Option.String({ name: 'value', required: true });

	async execute(): Promise<number> {
		const config = await getConfig();
		const inputKey = this.key;
		const inputValue = this.value;
		const camelCasedKey = inputKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
		const fmt = this.cli.format();

		switch (camelCasedKey) {
			case 'namespaceSeparator':
				config[camelCasedKey] = inputValue;
				break;
			case 'showAllDirectories':
				config[camelCasedKey] = ['yes', 'true'].includes(inputValue.toLowerCase());
				break;
			default:
				this.context.stdout.write(`I don't know any setting called ${fmt.code(camelCasedKey)}.\n`);
				return 1;
		}

		this.context.stdout.write(
			`Set the setting ${fmt.code(camelCasedKey)} to ${fmt.code(String(config[camelCasedKey]))}.\n`
		);
		await writeConfig(config);
		return 0;
	}
}
