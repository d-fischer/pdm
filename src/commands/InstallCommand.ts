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
	getUserCompletionDir: () => string;
	getUserCommandsDir: () => string;
	getSystemCompletionDir: () => Promise<string>;
	getSystemCommandsDir: () => Promise<string>;
	install: (commandDir: string, completionDir: string, command: InstallCommand) => Promise<void>;
}

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
const scriptsPath = (p: string) => path.resolve(currentDir, '../../shell-scripts/', p);

const shells: Record<string, ShellConfig> = {
	bash: {
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
			return '/etc';
		},
		async install(commandDir, completionDir) {
			const completionsScriptPath = scriptsPath('bash/completions/gp.sh');
			await fs.writeFile(path.join(completionDir, 'gp.sh'), `source '${completionsScriptPath}'\n`, 'utf-8');

			const commandsScriptPath = scriptsPath('bash/commands/gp.sh');
			const script = `\nsource '${commandsScriptPath}'\n`;
			// Bash doesn't have a standard directory where functions will be sourced. If we're asked to
			// install in the user's home directory or /etc, they probably just want it added to the bashrc.
			// Otherwise, assume the user set up a functions directory like fish has.
			if (commandDir === os.homedir()) {
				await fs.appendFile(path.join(commandDir, '.bashrc'), script, 'utf-8');
			} else if (commandDir === '/etc') {
				await fs.appendFile(path.join(commandDir, 'bashrc'), script, 'utf-8');
			} else {
				await fs.writeFile(path.join(commandDir, 'gp.sh'), script, 'utf-8');
			}
		}
	},
	fish: {
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
		async install(commandDir, completionDir) {
			const completionsScriptPath = scriptsPath('fish/commands/gp.fish');
			const commandsScriptPath = scriptsPath('fish/commands/gp.fish');

			await fs.writeFile(path.join(completionDir, 'gp.fish'), `source '${completionsScriptPath}'\n`, 'utf-8');
			await fs.writeFile(path.join(commandDir, 'gp.fish'), `source '${commandsScriptPath}'\n`, 'utf-8');
		}
	},
	zsh: {
		getUserCompletionDir() {
			return os.homedir();
		},
		getUserCommandsDir() {
			return os.homedir();
		},
		async getSystemCompletionDir() {
			return '/usr/local/share/zsh/site-functions';
		},
		async getSystemCommandsDir() {
			return '/usr/local/share/zsh/site-functions';
		},
		async install(commandDir, completionDir, command) {
			// Zsh doesn't have a standard user level auto load location. If we're asked to install in
			// the home directory, the user probably wants our install location added to their fpath
			// in their .zshrc. Unfortunately, just appending the fpath to the end isn't enough since
			// it needs to be set before the call to `autoload -Uz compinit` in that file, so add it
			// to the start of the file.

			if (completionDir === os.homedir()) {
				let oldContents = '';
				try {
					oldContents = await fs.readFile(path.join(commandDir, '.zshrc'), 'utf-8');
				} catch {
					// ignore, file doesn't exist yet.
				}
				await fs.writeFile(
					path.join(commandDir, '.zshrc'),
					`fpath=('${scriptsPath('zsh/completions')}' $fpath)\n${oldContents}`
				);
			} else {
				const completionsScriptPath = scriptsPath('zsh/completions/_gp');
				await fs.writeFile(
					path.join(completionDir, '_gp'),
					`#compdef gp\nsource '${completionsScriptPath}'\n`,
					'utf-8'
				);
			}

			if (commandDir === os.homedir()) {
				let oldContents = '';
				try {
					oldContents = await fs.readFile(path.join(commandDir, '.zshrc'), 'utf-8');
				} catch {
					// ignore, file doesn't exist yet.
				}
				await fs.writeFile(
					path.join(commandDir, '.zshrc'),
					`fpath=('${scriptsPath('zsh/commands')}' $fpath)\nautoload -Uz gp\n${oldContents}`
				);
			} else {
				const commandsScriptPath = scriptsPath('zsh/commands/gp');
				await fs.writeFile(path.join(commandDir, 'gp'), `source '${commandsScriptPath}'\n`, 'utf-8');

				const fmt = command.cli.format();
				command.context.stdout.write(
					`The gp command has been added to ${fmt.code(
						commandDir
					)}, but not configured for autoloading.\nConfigure autoloading with ${fmt.code(
						'autoload -Uz gp'
					)}\n`
				);
			}
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
				`This command currently only supports the ${fmt.code('bash')}, ${fmt.code('fish')}, and ${fmt.code(
					'zsh'
				)} shells.\n`
			);
			return 1;
		}

		const completionsDir = await this._getCompletionsPath();
		const commandsDir = await this._getCommandsPath();

		await fs.mkdir(completionsDir, { recursive: true });
		await fs.mkdir(commandsDir, { recursive: true });
		await shells[this.shell].install(commandsDir, completionsDir, this);

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
