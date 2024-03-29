const path = require('path');
const fs = require('fs');
const { modLoaderServer } = require('./assets/modLoaderServer.js');
const { firstTimeSetup, loadMod, displayError, preloadMods, packagenw } = require('./assets/utils.js');
const { exec } = require('child_process');
console.clear();

console.log('Starting MIML');


(async () =>
{
	const gamePath = process.cwd();
	const args = process.argv.slice(2);
	const miml = {
		mods: [],
	};

	// Startup cleanup
	if (fs.existsSync(path.join(gamePath, 'tmp-package'))) {
		fs.rmSync(path.join(gamePath, 'tmp-package'), {
			recursive: true,
			force: true,
		});
	}

	// First time setup
	if (!fs.existsSync(path.join(gamePath, 'game/')) || args.includes('--repatch')) {
		await firstTimeSetup();
	} else {
		console.log('Skipping first time setup (game files already exist)');
	}

	if (args.includes('--unpack')) {
		console.log('unpacking');
		await packagenw.decompress();
		return process.exit(0);
	}

	console.log('Loading mods');
	await new Promise((resolve) =>
	{
		if (fs.readdirSync(path.join(gamePath, 'mods')).length === 0) {
			console.log('No mods found');
			resolve();
		} else {
			fs.readdirSync(path.join(gamePath, 'mods')).forEach(
				async (file, index, array) =>
				{
					await loadMod(file, miml);
					if (index === array.length - 1) resolve();
				}
			);
		}
	}).catch(async (err) =>
	{
		await displayError(`Failed to load mods, ${err}`);
	});

	console.log('Starting game');

	let executable;
	switch (process.platform) {
		case 'win32':
			console.log('Running on Windows');
			executable = path.join(gamePath, 'game', 'Moonstone Island.exe');
			break;
		case 'linux':
			console.log('Running on Linux');
			executable = path.join(gamePath, 'game', 'Moonstone Island');
			break;
		case 'darwin':
			console.log('MacOS');
			break;
		default:
			console.log('OS not supported');
			process.exit(0);
	}

	modLoaderServer.start();

	preloadMods.forEach((mod) =>
	{
		const modPath = path.join(gamePath, 'mods', mod.name, mod.preload);
		if (fs.existsSync(modPath)) {
			console.log(`Preloading ${mod.name}`);
			require(modPath);
		} else {
			console.log(`Failed to preload ${mod.name}`);
		}
	});

	exec(`"${executable}"`, { cwd: gamePath }, async (err, stdout, stderr) =>
	{
		if (err) {
			await displayError(`Failed to start game, ${err}`);
			return;
		}
		console.log(stdout);
		console.error(stderr);
	})
		.on('exit', (code) =>
		{
			console.log(`Game exited with code ${code}`);
			modLoaderServer.stop();
			process.exit(0);
		})
		.on('spawn', () =>
		{
			console.log('Game started :3');
			modLoaderServer.io.on('connection', () =>
			{
				modLoaderServer.import();
				modLoaderServer.io.emit('global', miml);
			});
		});
})();
