import { exec } from 'child_process';
import { Command, Option } from 'clipanion';
import envPaths from 'env-paths';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import url from 'url';

async function execShell(cmd: string): Promise<string> {
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

interface ShellConfig {
	completions: string;
	getUserCompletionDir: () => string;
	getUserCommandsDir: () => string;
	getSystemCompletionDir: () => Promise<string>;
	getSystemCommandsDir: () => Promise<string>;
	installCommands: (commandDir: string) => Promise<void>;
}

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
const scriptsPath = (p: string) => path.resolve(currentDir, '../../shell-scripts/', p);

const shells: Record<string, ShellConfig> = {
	bash: {
		completions: scriptsPath('bash/completions/gp.sh'),
		getUserCompletionDir() {
			// Using envPaths for bash likely doesn't make sense for most users.
			// On Windows, it would tell us to put files in %APPDATA%, which git bash doesn't look at.
			// https://github.com/scop/bash-completion#faq
			if (process.env.BASH_COMPLETION_USER_DIR) {
				return process.env.BASH_COMPLETION_USER_DIR;
			} else if (process.env.XDG_DATA_HOME) {
				return path.join(process.env.XDG_DATA_HOME, 'bash-completion/completions');
			} else {
				return path.join(os.homedir(), '.local/share/bash-completion');
			}
		},
		getUserCommandsDir() {
			return os.homedir();
		},
		async getSystemCompletionDir() {
			return (await execShell('pkg-config --variable=completionsdir bash-completion')).trimEnd();
		},
		async getSystemCommandsDir() {
			// Bash doesn't define a directory for functions, so put gp in the standard location.
			return '/usr/local/bin';
		},
		async installCommands(commandDir) {
			const commandsScriptPath = scriptsPath('bash/commands/gp.sh');
			// Bash doesn't have a standard directory where functions will be sourced. If we're asked to
			// install in the user's home directory, they probably just want it added to their bashrc.
			// Otherwise, assume the user set up a functions directory like fish has.
			if (commandDir === os.homedir()) {
				await fs.appendFile(path.join(commandDir, '.bashrc'), `\nsource '${commandsScriptPath}'\n`, 'utf-8');
			} else {
				await fs.writeFile(path.join(commandDir, 'gp.sh'), `\nsource '${commandsScriptPath}'\n`, 'utf-8');
			}
		}
	},
	fish: {
		completions: scriptsPath('fish/completions/gp.fish'),
		getUserCompletionDir() {
			const fishUserConfigPath = envPaths('fish', { suffix: '' }).config;
			return path.join(fishUserConfigPath, 'functions');
		},
		getUserCommandsDir() {
			const fishUserConfigPath = envPaths('fish', { suffix: '' }).config;
			return path.join(fishUserConfigPath, 'completions');
		},
		async getSystemCompletionDir() {
			return (await execShell('pkg-config --variable completionsdir fish')).trimEnd();
		},
		async getSystemCommandsDir() {
			return (await execShell('pkg-config --variable functionsdir fish')).trimEnd();
		},
		async installCommands(commandDir) {
			const commandsScriptPath = scriptsPath('fish/commands/gp.fish');
			await fs.writeFile(path.join(commandDir, 'gp.fish'), `source '${commandsScriptPath}'\n`, 'utf-8');
		}
	}
};

export class InstallCommand extends Command {
	static paths = [['install']];

	static usage = Command.Usage({
		description: 'install helpers to your shell',
		details: `
			Install a shell helper for pdm to quickly navigate between projects.

			Currently, only the fish and bash shells are supported.
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
		if (!{}.hasOwnProperty.call(shells, this.shell)) {
			this.context.stderr.write(
				`This command currently only supports the ${fmt.code('fish')} and ${fmt.code('bash')} shells.\n`
			);
			return 1;
		}

		const completionsScriptPath = shells[this.shell].completions;

		const completionsPath = path.join(await this._getCompletionsPath(), path.basename(completionsScriptPath));
		const commandsDir = await this._getCommandsPath();

		await fs.mkdir(path.dirname(completionsPath), { recursive: true });
		await fs.writeFile(completionsPath, `source '${completionsScriptPath}'\n`, 'utf-8');

		await fs.mkdir(commandsDir, { recursive: true });
		await shells[this.shell].installCommands(commandsDir);

		this.context.stdout.write(`Successfully installed ${fmt.code(this.shell)} shell helpers\n`);

		return 0;
	}

	private async _getCompletionsPath(): Promise<string> {
		if (this.completionsPath) {
			return this.completionsPath;
		}

		if (!this.global) {
			return shells[this.shell].getUserCompletionDir();
		}

		try {
			return await shells[this.shell].getSystemCompletionDir();
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
			return shells[this.shell].getUserCommandsDir();
		}

		try {
			return await shells[this.shell].getSystemCommandsDir();
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
}
