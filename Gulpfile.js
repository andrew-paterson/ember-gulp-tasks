const fs = require('fs');
const gulp = require('gulp');
const dirSync = require('gulp-directory-sync');
const gutil = require('gulp-util');
const settings = require('./settings.json');
const browserSyncSites = settings.browserSyncSites || [];
const addonToApp = settings.addonToApp || [];
const emberApps = settings.emberApps || [];
const chalk = require('chalk');

function removeLeadingSlash(string) {
  if (string.split('')[0] === '/') {
    string = string.substr(1);
  }
  return string;
}

var syncObjects = [];
addonToApp.from.forEach(addonPath => {
	var addonName = addonPath.split('/').slice(-1)[0];
	var object = {
		addonPath: addonPath,
		addonName: addonName,
		dependentPaths: []
	};
	var gitHEADfileLines = fs.readFileSync(`${addonPath}/.git/HEAD`, "utf8").split(/\r?\n/);
	gitHEADfileLines.forEach(line => {
		if (line.indexOf('ref:') > -1) { // If the repo has a branch checked out
			object.currentBranch = line.replace('ref: refs/heads/', '');
		} else if (line.match(/\b[0-9a-f]{40}\b/)) { // If the repo has a sha checked out
			object.currentBranch = line;
		}
	});
	
	addonToApp.to.forEach(emberAppPath => {
    var path = `${emberAppPath}/node_modules/${addonName}`;
		if (fs.existsSync(path)) {
			var appName = emberAppPath.split('/')[emberAppPath.split('/').length - 1];
			// var packagefile = `${emberAppPath}/package.json`;
			// var packageJSONContent = JSON.parse(fs.readFileSync(packagefile, "utf8"));
      // var packageVersion = packageJSONContent.devDependencies[addonName];
      var packageFile = require(`${emberAppPath}/package-lock.json`);
      var packageVersion = packageFile.dependencies[addonName].from;
			var packageBranch = packageVersion.split('#')[1];
			object.dependentPaths.push({
				name: appName,
				path: path,
				installedBranch: packageBranch
      });
		}
	});
	syncObjects.push(object);
});

var addonWatchPaths = addonToApp.from.map(addonPath => {
	return `${removeLeadingSlash(addonPath)}/addon/**/*`;
}).concat(addonToApp.from.map(addonPath => {
	return `${removeLeadingSlash(addonPath)}/app/**/*`;
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
	gulp.watch(addonWatchPaths, { cwd: '/'}, ['sync-local-addons']);
});

gulp.task('default', ['sync-local-addons', 'watch']);