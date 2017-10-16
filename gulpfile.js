"use strict";

/*Gulp variables*/
const autoprefixer  = require('gulp-autoprefixer');
const babel         = require('gulp-babel');
const browserSync   = require('browser-sync');
const cache         = require('gulp-cache');
const csscomb       = require('gulp-csscomb');
const clean         = require('gulp-clean');
const concat        = require('gulp-concat');
const cssnano       = require('gulp-cssnano');
const ftp           = require('vinyl-ftp');
const gulp          = require('gulp');
const gutil         = require('gulp-util');
const imagemin      = require('gulp-imagemin');
const notify        = require('gulp-notify');
const plumber       = require('gulp-plumber');
const pngquant      = require('imagemin-pngquant');
const rename        = require('gulp-rename');
const sass          = require('gulp-sass');
const sftp          = require('gulp-sftp');
const sourcemaps    = require('gulp-sourcemaps');
const uglify        = require('gulp-uglifyjs');
const uncss         = require('gulp-uncss');
const wiredep       = require('wiredep').stream;


/*Path variables*/
const path = {
    html    : '',
    css     : 'assets/css/',
    sass    : 'assets/sass/',
    fonts   : 'assets/fonts/',
    js      : 'assets/js/',
    es6     : 'assets/es6/',
    images  : 'images/',
    libs    : 'libs/'
};


/*Browser Sync variables*/
let bs_index = 'index.html';


/*FTP connection variables*/
const config = {
    site            : 'sitename',
    host            : 'host',
    user            : 'anonymous',
    pass            : 'anonymous@',
    port            : '21',
    key_path        : null,
    passphrase      : null,
    parallel        : 10,
    remote_folder   : '/public_html'
};

const globs = [
    // 'app/' + path.html + '*.html',
    'app/' + path.css + '*'
    // 'app/' + path.js + '*.js',
    // 'app/' + path.fonts + '**',
    // 'app/' + path.libs + '**',
    // 'app/**',
];

function getFtpConnection() {
    return ftp.create({
        host:       config.host,
        user:       config.user,
        password:   config.pass,
        port:       config.port,
        parallel:   config.parallel,
        log:        gutil.log
    });
}
function getSftpConnection() {
    return sftp({
        host:           config.host,
        user:           config.user,
        pass:           config.pass,
        port:           config.port,
        key:            config.key_path,
        passphrase:     config.passphrase,
        remotePath:     config.remote_folder
    });
}

/*Error notify settings*/
let notifyInfo = {
    title: 'Gulp'
};
let plumberErrorHandler = {
    errorHandler: notify.onError({
        title: notifyInfo.title,
        icon: notifyInfo.icon,
        message: "Error: <%= error.message %>"
    })
};

/*Clean production folder*/
gulp.task('clean', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

/*Clear cache*/
gulp.task('clear-cache', function () {
    return cache.clearAll();
});

/*Convert css to scss*/
gulp.task('convert-css-scss', function () {
    return gulp.src('app/' + path.css + '*.css')
        .pipe(gulp.dest('app/' + path.sass));
});

/*Enable sass support + auto prefixer and source maps*/
gulp.task('sass', function () {
    return gulp.src('app/' + path.sass + '*.scss')
        .pipe(plumber(plumberErrorHandler))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], {cascade: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('app/' + path.css))
        .pipe(browserSync.reload({stream:true}));
});

/*Translate ES6 to ES5 via Babel*/
gulp.task('babel', function () {
    gulp.src('app/' + path.es6 + '/**/*.js')
        .pipe(plumber(plumberErrorHandler))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('app/' + path.js))
        .pipe(browserSync.reload({stream:true}));
});

/*Enable bower dependencies*/
gulp.task('wiredep', function () {
    gulp.src('app/' + path.html + '*.html')
        .pipe(wiredep({
            directory: 'app/' + path.libs
        }))
        .pipe(gulp.dest('app/' + path.html));
});

/*Minify and combine script files*/
gulp.task('script:minify', ['babel'], function () {
    return gulp.src('app/' + path.js + '**/*.js')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('app/' + path.js));
});

/*Minify styles and lib styles*/
gulp.task('css:minify', ['sass'], function () {
    return gulp.src('app/' + path.css + '**/*.css')
        .pipe(cssnano())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('dist/' + path.css));
});

/*Clean styles from unused selectors*/
gulp.task('uncss', ['sass'], function () {
    return gulp.src('app/' + path.css + '*.css')
        .pipe(uncss({
            html: ['app/' + path.html + '*.html']
        }))
        .pipe(rename({suffix: '.un'}))
        .pipe(gulp.dest('dist/' + path.css));
});

/*Auto reload browser*/
gulp.task('browser-sync', function () {
    browserSync({
        server: {
            baseDir: 'app',
            index: bs_index
        },
        // http://weberty.localtunnel.me
        tunnel: "weberty",
        open: "tunnel",
        notify: false
    });
});

/*Minify images*/
gulp.task('img:minify', function () {
    return gulp.src('app/' + path.images + '**/*')
        .pipe(cache(imagemin({
            interlaced: true,
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        })))
        .pipe(gulp.dest('dist/' + path.images));
});


gulp.task('ftp', function () {
    const init_connect = getFtpConnection();
    return gulp.src(globs, {base: './app/', buffer: false})
        .pipe(init_connect.newer(config.remote_folder))
        .pipe(init_connect.dest(config.remote_folder));
});

gulp.task('sftp', function () {
    const init_connect = getSftpConnection();
    return gulp.src(globs, {base: './app', buffer: false})
        .pipe(init_connect);
});

/*Enable watcher for remote server ftp*/
gulp.task('watch:remote:ftp', function () {
    browserSync({
        open: 'external',
        proxy: config.site,
        reloadDelay: 3500,
        notify: false
    });

    gulp.watch('app/' + path.sass + '*.scss', ['sass']);
    gulp.watch('app/' + path.es6 + '**/*.js', ['babel']);
    gulp.watch(globs, ['ftp']).on('change', browserSync.reload);
});

/*Enable watcher for remote server sftp*/
gulp.task('watch:remote:sftp', function () {
    browserSync({
        open: 'external',
        proxy: config.site,
        reloadDelay: 3500,
        notify: false
    });

    gulp.watch('app/' + path.sass + '*.scss', ['sass']);
    gulp.watch('app/' + path.es6 + '**/*.js', ['babel']);
    gulp.watch(globs, ['sftp']).on('change', browserSync.reload);
});

/*Enable local watcher*/
gulp.task('watch:local', ['browser-sync'], function () {
    gulp.watch('app/' + path.html + '*.html', browserSync.reload);
    gulp.watch('app/' + path.sass + '**/*.scss', ['sass']);
    gulp.watch('app/' + path.es6 + '**/*.js', ['babel']);
    gulp.watch('bower.json', ['wiredep'], browserSync.reload);
});

/*Build project for production*/
gulp.task('build', ['clean', 'img:minify', 'sass', 'css:minify', 'babel', 'script:minify'], function () {

    let buildCss = gulp.src('app/' + path.css + '*')
        .pipe(gulp.dest('dist/' + path.css ));

    let buildLibs = gulp.src('app/' + path.libs + '**/*')
        .pipe(gulp.dest('dist/' + path.libs));

    let buildFonts = gulp.src('app/' + path.fonts + '**/*')
        .pipe(gulp.dest('dist/' + path.fonts));

    let buildJs = gulp.src('app/' + path.js + '**/*')
        .pipe(gulp.dest('dist/' + path.js));

    let buildHtml = gulp.src('app/' + path.html + '*.html')
        .pipe(gulp.dest('dist/' + path.html));
});

/*Ftp deploy*/
gulp.task('ftp-deploy', function () {
    const init_connect = getFtpConnection();

    return gulp.src('dist/**', {base: './dist/', buffer: false})
        .pipe(init_connect.newer(config.remote_folder))
        .pipe(init_connect.dest(config.remote_folder));
});