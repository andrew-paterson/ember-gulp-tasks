const fs = require('fs');
const gulp = require('gulp');
const dirSync = require('gulp-directory-sync');
const gutil = require('gulp-util');
const settings = require('./settings.json');
const browserSyncPorts = settings.browserSyncPorts || [];
const manyToMany = settings.manyToMany || [];
const chalk = require('chalk');

function removeLeadingSlash(string) {
  if (string.split('')[0] === '/') {
    string = string.substr(1);
  }
  return string;
}

var syncObjects = [];
manyToMany.from.forEach(fromPath => {
	var addonName = fromPath.split('/').slice(-1)[0];
	var object = {
		fromPath: fromPath,
		addonName: addonName,
		dependentPaths: []
	};
	var gitHEADfileLines = fs.readFileSync(`${fromPath}/.git/HEAD`, "utf8").split(/\r?\n/);
	gitHEADfileLines.forEach(line => {
		if (line.indexOf('ref:') > -1) { // If the repo has a branch checked out
			object.currentBranch = line.replace('ref: refs/heads/', '');
		} else if (line.match(/\b[0-9a-f]{40}\b/)) { // If the repo has a sha checked out
			object.currentBranch = line;
		}
	});
	
	manyToMany.to.forEach(toPath => {
    if (toPath === fromPath) {
      return;
    }
    var path = `${toPath}/node_modules/${addonName}`;
		if (fs.existsSync(path)) {
			var appName = toPath.split('/')[toPath.split('/').length - 1];
      var packageFile = require(`${toPath}/package-lock.json`);
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

var addonWatchPaths = manyToMany.from.map(fromPath => {
	return `${removeLeadingSlash(fromPath)}/addon/**/*`;
}).concat(manyToMany.from.map(fromPath => {
	return `${removeLeadingSlash(fromPath)}/app/**/*`;
}));

gulp.task('sync-local-addons', function (done) {	
	syncObjects.forEach(syncObject => {
		syncObject.dependentPaths.forEach(dependentPath => {
			['app', 'addon'].forEach(subDir => {
				return gulp.src('.', {allowEmpty: true})
					.pipe(dirSync(`${syncObject.fromPath}/${subDir}`, `${dependentPath.path}/${subDir}`, {
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
  done();
});

var browserSyncInstances = {};
browserSyncPorts.forEach(browserSyncSite => {
	browserSyncInstances[browserSyncSite] = require('browser-sync').create();
});

gulp.task('watch', function () {
	var browserSyncPort = 8080;
	var browserSyncOptions = function (index) {
		return {
			open: 'external',
			proxy: `localhost:${browserSyncPorts[index]}`,
			port: browserSyncPort + index
		};
	};
	var initiateBrowserSync = function (index) {
		index = index || 0;
		browserSyncInstances[browserSyncPorts[index]].init(browserSyncOptions(index), function () {
			if (browserSyncPorts[index + 1]) {
				initiateBrowserSync(index + 1);
			}
		});
	};
	if (browserSyncPorts.length > 0) {
		initiateBrowserSync();
	}
	gulp.watch(addonWatchPaths, { cwd: '/'}, gulp.series('sync-local-addons'));
});

gulp.task('default', gulp.series(['sync-local-addons', 'watch']));