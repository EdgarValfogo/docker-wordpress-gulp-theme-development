import gulp from 'gulp';
import yargs from 'yargs';
import sass from 'gulp-sass';
import cleanCss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import sourcemaps from 'gulp-sourcemaps';
import imagemin from 'gulp-imagemin';
import del from 'del';
import webpack from 'webpack-stream';
import uglify from 'gulp-uglify';
import named from 'vinyl-named';
import browserSync from 'browser-sync';
import zip from 'gulp-zip';
import replace from 'gulp-replace';
import info from './package.json';

const server = browserSync.create();
const PRODUCTION = yargs.argv.prod;

const paths = {
	styles: {
		src: ['theme-development/src/assets/scss/bundle.scss','theme-development/src/assets/scss/admin.scss'],
		dest: 'theme-development/dist/assets/css'
	},
	images: {
		src: 'theme-development/src/assets/images/**/*.{jpg,jpeg,png,svg,gif}',
		dest: 'theme-development/dist/assets/images'
	},
	scrips: {
		src: ['theme-development/src/assets/js/bundle.js','theme-development/src/assets/js/admin.js'],
		dest: 'theme-development/dist/assets/js'
	},
	other: {
		src: ['theme-development/src/assets/**/*','!theme-development/src/assets/{images,js,scss}', '!theme-development/src/assets/{images,js,scss}/**/*'],
		dest: 'theme-development/dist/assets'
	},
	wordpressContainer: {
		dest: 'wp-content/themes/' + info.name
	},
	package: {
		src: [
		      "theme-development/**/*",
		      "!.vscode",
		      "!node_modules{,/**}",
		      "!theme-development/packaged{,/**}",
		      "!theme-development/src{,/**}",
		      "!.babelrc",
		      "!.gitignore",
		      "!gulpfile.babel.js",
		      "!package.json",
		      "!package-lock.json"
    	],
		dest: 'theme-development/packaged'
	}
}

export const serve = (done) => {
	server.init({
		proxy: "http://localhost:8888/"
	});
	done();
}

export const reload = (done) => {
	server.reload();
	done();
}

export const clean = () => {
	return del(['theme-development/dist', 'wp-content/themes/' + info.name]);
}

export const styles = (done) => {
	return gulp.src(paths.styles.src)
		.pipe(gulpif(!PRODUCTION, sourcemaps.init()))
		.pipe(sass().on('error',sass.logError))
		.pipe(gulpif(PRODUCTION, cleanCss({compatibility:'ie8'})))
		.pipe(gulpif(!PRODUCTION, sourcemaps.write()))
		.pipe(gulp.dest(paths.styles.dest))
		.pipe(server.stream());
}

export const images = () => {
	return gulp.src(paths.images.src)
		.pipe(gulpif(PRODUCTION, imagemin()))
		.pipe(gulp.dest(paths.images.dest));
}

export const watch = () => {
	gulp.watch('theme-development/src/assets/scss/**/*.scss', styles);
	gulp.watch('theme-development/src/assets/js/**/*.js', gulp.series(scripts, reload));
	gulp.watch('theme-development/**/*.php', reload);
	gulp.watch(paths.images.src, gulp.series(images, reload));
	// gulp.watch(paths.other.src, gulp.series(copy, reload));
	gulp.watch(paths.other.dest, gulp.series(copy, copyToWordpress, reload));
} 


export const copy = () => {
	return gulp.src(paths.other.src)
		.pipe(gulp.dest(paths.other.dest));
}

export const copyToWordpress = () => {
	return gulp.src(['theme-development/**/*', '!theme-development/src/**/*', '!theme-development/src'])
		.pipe(replace('_themename', info.name))
		.pipe(gulp.dest(paths.wordpressContainer.dest));
}

export const scripts = () => {
	return gulp.src(paths.scrips.src)
	.pipe(named())
	.pipe(webpack({
		module: {
			rules: [
				{
					test: /\.js$/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env']
						}
					}
				}
			]
		},
		output: {
			filename: '[name].js'
		},
		externals: {
			jquery: 'jQuery'
		},
		devtool: !PRODUCTION ? 'inline-source-map' : false
	}))
	.pipe(gulpif(PRODUCTION, uglify()))
	.pipe(gulp.dest(paths.scrips.dest));
}

export const compress = () => {
	return gulp.src(paths.package.src)
		.pipe(replace('_themename', info.name))
		.pipe(zip(`${info.name}.zip`))
		.pipe(gulp.dest(paths.package.dest));
}

export const dev = gulp.series(clean, gulp.parallel(styles, scripts, images, copy, copyToWordpress), serve, watch);
export const build = gulp.series(clean, gulp.parallel(styles, scripts, images, copy));
export const bundle = gulp.series(build,compress);

export default dev;