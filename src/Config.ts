import envPaths from 'env-paths';
import { promises as fs } from 'fs';
import path from 'path';

const paths = envPaths('pdm', { suffix: '' });

export interface ProjectRoot {
	name: string;
	path: string;
}

export interface Config {
	projectRoot?: string;
	roots?: ProjectRoot[];
}

async function ensureConfigDir() {
	const dir = paths.config;
	await fs.mkdir(dir, { recursive: true });

	return dir;
}

async function getConfigContents(): Promise<string | null> {
	const dir = await ensureConfigDir();
	try {
		return await fs.readFile(path.join(dir, 'config.json'), 'utf-8');
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw e;
	}
}

export async function getConfig(): Promise<Config> {
	const contents = await getConfigContents();

	if (contents === null) {
		return {};
	}

	return JSON.parse(contents) as Config;
}

export async function writeConfig(config: Config): Promise<void> {
	const dir = await ensureConfigDir();
	const contents = JSON.stringify(config);

	await fs.writeFile(path.join(dir, 'config.json'), contents, 'utf-8');
}

export async function migrateConfig(): Promise<void> {
	const conf = await getConfig();
	if (conf.projectRoot) {
		conf.roots ??= [];
		conf.roots.push({
			name: 'legacy',
			path: conf.projectRoot.replace(/\/$/, '')
		});
		conf.projectRoot = undefined;
	}

	await writeConfig(conf);
}
