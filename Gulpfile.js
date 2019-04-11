const fs = require('fs');
const gulp = require('gulp');
const dirSync = require('gulp-directory-sync');
const gutil = require('gulp-util');
const settings = require('./settings.json');
const browserSyncSites = settings.browserSyncSites || [];
const emberAddons = settings.emberAddons || [];
const emberApps = settings.emberApps || [];

var syncObjects = [];
emberAddons.forEach(addonPath => {
	var object = {
		addonPath: addonPath,
		dependentPaths: []
	};
	var addonName = addonPath.split('/').slice(-1)[0];
	emberApps.forEach(emberAppPath => {
		var path = `${emberAppPath}/node_modules/${addonName}`;
		if (fs.existsSync(path)) {
			object.dependentPaths.push(path);
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
			['app', 'addon'].forEach(subDir => {
				return gulp.src('')
					.pipe(dirSync(`${syncObject.addonPath}/${subDir}`, `${dependentPath}/${subDir}`, {
						printSummary: false
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