const fs = require('fs');
const gulp = require('gulp');
const dirSync = require('gulp-directory-sync');
const gutil = require('gulp-util');
const settings = require('./settings.json');
const browserSyncSites = settings.browserSyncSites || [];
const emberAddons = settings.emberAddons || [];
const emberApps = settings.emberApps || [];
const chalk = require('chalk');

var syncObjects = [];
emberAddons.forEach(addonPath => {
	var addonName = addonPath.split('/').slice(-1)[0];
	var object = {
		addonPath: addonPath,
		addonName: addonName,
		dependentPaths: []
	};
	var gitHEADfileLines = fs.readFileSync(`${addonPath}/.git/HEAD`, "utf8").split(/\r?\n/);
	gitHEADfileLines.forEach(line => {
		if (line.indexOf('ref:') > -1) {
			object.currentBranch = line.split('/')[line.split('/').length-1];
		} else if (line.match(/\b[0-9a-f]{40}\b/)) {
			object.currentBranch = line;
		}
	});
	
	emberApps.forEach(emberAppPath => {
		var path = `${emberAppPath}/node_modules/${addonName}`;
		var appName = emberAppPath.split('/')[emberAppPath.split('/').length - 1];
		var packagefile = `${emberAppPath}/package.json`;
		var packageJSONContent = JSON.parse(fs.readFileSync(packagefile, "utf8"));
		var packageVersion = packageJSONContent.devDependencies[addonName];
		var packageBranch = packageVersion.split('#')[1];
		if (fs.existsSync(path)) {
			object.dependentPaths.push({
				name: appName,
				path: path,
				installedBranch: packageBranch
			});
		}
	});
	syncObjects.push(object);
});

var addonWatchPaths = emberAddons.map(addonPath => {
	return `${addonPath}/addon/**/*`;
}).concat(emberAddons.map(addonPath => {
	return `${addonPath}/app/**/*`;
}));

gulp.task('sync-local-addons', function () {	
	syncObjects.forEach(syncObject => {
		syncObject.dependentPaths.forEach(dependentPath => {
			if (syncObject.currentBranch !== dependentPath.installedBranch) {
				console.log(chalk.red(`${syncObject.addonName} [checked out branch ${syncObject.currentBranch}] was not synced to ${dependentPath.name} [installed branch ${dependentPath.installedBranch}]`));
				return;
			}
			['app', 'addon'].forEach(subDir => {
				return gulp.src('')
					.pipe(dirSync(`${syncObject.addonPath}/${subDir}`, `${dependentPath.path}/${subDir}`, {
						printSummary: function( result ) {
							if (result.created > 0 || result.updated > 0 || result.removed > 0) {
								console.log(chalk.green(`${syncObject.addonName}/${subDir} >>> ${dependentPath.name}/${subDir}`)); 
								gutil.log(chalk.yellow( 'Dir Sync: ' + result.created + ' files created, ' + result.updated + ' files updated, ' + result.removed + ' items deleted, ' + result.same + ' files unchanged' ));
							}
						}
					}))
					.on('error', gutil.log);
			});
		});
	});
});

var browserSyncInstances = {};
browserSyncSites.forEach(browserSyncSite => {
	browserSyncInstances[browserSyncSite] = require('browser-sync').create();
});

gulp.task('watch', function () {
	var browserSyncPort = 8080;
	var browserSyncOptions = function (index) {
		return {
			open: 'external',
			proxy: `localhost:${browserSyncSites[index]}`,
			port: browserSyncPort + index
		};
	};
	var initiateBrowserSync = function (index) {
		index = index || 0;
		browserSyncInstances[browserSyncSites[index]].init(browserSyncOptions(index), function () {
			if (browserSyncSites[index + 1]) {
				initiateBrowserSync(index + 1);
			}
		});
	};
	if (browserSyncSites.length > 0) {
		initiateBrowserSync();
	}

	gulp.watch(addonWatchPaths, ['sync-local-addons']);
});

gulp.task('default', ['sync-local-addons', 'watch']);