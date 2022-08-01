import { exec } from 'child_process';
import { Command, Option } from 'clipanion';
import envPaths from 'env-paths';
import { promises as fs } from 'fs';
import path from 'path';

const fishUserConfigPath = envPaths('fish', { suffix: '' }).config;

export class InstallCommand extends Command {
	static paths = [['install']];

	static usage = Command.Usage({
		description: 'install helpers to your shell',
		details: `
			Install a shell helper for pdm to quickly navigate between projects.
			
			Currently, only the fish shell is supported.
		`,
		examples: [
			['Install fish shell helpers for yourself', 'pdm install fish'],
			['Install fish shell helpers for all users', 'pdm install fish --global']
		]
	});

	shell = Option.String({ name: 'shell' });
	global = Option.Boolean('-g,--global', {
		description: `
			Applies the helper for all users.

			May require root privileges.
			Has no effect if the paths are overridden using --completions-path and --commands-path.
		`
	});
	completionsPath = Option.String('--completions-path', {
		description: 'Explicitly pass a path to install the completions to.'
	});
	commandsPath = Option.String('--functions-path', {
		description: 'Explicitly pass a path to install the commands to.'
	});

	async execute(): Promise<number> {
		const fmt = this.cli.format();
		if (this.shell !== 'fish') {
			this.context.stderr.write(`This command currently only supports the ${fmt.code('fish')} shell.\n`);
			return 1;
		}

		const completionsPath = await this._getCompletionsPath();
		const commandsPath = await this._getCommandsPath();

		const currentDir = path.dirname(import.meta.url.replace(/^file:\/\//, ''));
		const completionsScriptPath = path.resolve(currentDir, '../../shell-scripts/fish/completions/gp.fish');
		const commandsScriptPath = path.resolve(currentDir, '../../shell-scripts/fish/commands/gp.fish');

		await fs.writeFile(path.join(completionsPath, 'gp.fish'), `source ${completionsScriptPath}\n`, 'utf-8');
		await fs.writeFile(path.join(commandsPath, 'gp.fish'), `source ${commandsScriptPath}\n`, 'utf-8');

		this.context.stdout.write(`Successfully installed ${fmt.code(this.shell)} shell helpers\n`);

		return 0;
	}

	private async _getCompletionsPath(): Promise<string> {
		if (this.completionsPath) {
			return this.completionsPath;
		}

		if (!this.global) {
			return path.join(fishUserConfigPath, 'completions');
		}

		try {
			return (await this._execShell('pkg-config --variable completionsdir fish')).trimEnd();
		} catch (e) {
			const fmt = this.cli.format();
			this.context.stderr.write(`Unable to find the completions path via ${fmt.code('pkg-config')}.
Please make sure ${fmt.code(
				'pkg-config'
			)} is installed on your system or manually pass the path for completions using the ${fmt.code(
				'--completions-path'
			)} option.\n`);

			return process.exit(1);
		}
	}

	private async _getCommandsPath(): Promise<string> {
		if (this.commandsPath) {
			return this.commandsPath;
		}

		if (!this.global) {
			return path.join(fishUserConfigPath, 'functions');
		}

		try {
			return (await this._execShell('pkg-config --variable functionsdir fish')).trimEnd();
		} catch (e) {
			const fmt = this.cli.format();
			this.context.stderr.write(`Unable to find the commands path via ${fmt.code('pkg-config')}.
Please make sure ${fmt.code(
				'pkg-config'
			)} is installed on your system or manually pass the path for commands using the ${fmt.code(
				'--commands-path'
			)} option.\n`);

			return process.exit(1);
		}
	}

	private async _execShell(cmd: string): Promise<string> {
		return await new Promise<string>((resolve, reject) => {
			exec(cmd, (error, stdout) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(stdout);
			});
		});
	}
}
