"use strict";

/*Gulp variables*/
var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync');
var cache = require('gulp-cache');
var csscomb = require('gulp-csscomb');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');
var ftp = require('vinyl-ftp');
var gulp = require('gulp');
var gutil = require('gulp-util');
var imagemin = require('gulp-imagemin');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var pngquant = require('imagemin-pngquant');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglifyjs');
var uncss = require('gulp-uncss');
var wiredep = require("wiredep").stream;


/*Path variables*/
var html_Src    = '';
var css_Src     = 'assets/css/';
var sass_Src    = 'assets/sass/';
var font_Src    = 'assets/fonts/';
var js_Src      = 'assets/js/';
var img_Src     = 'images/';
var libs_Src    = 'libs/';


/*Browser Sync variables*/
var bs_index = 'index.html';


/*FTP connection variables*/
var site_name       = 'sitename';
var host_ftp        = 'host';
var user_ftp        = 'anonymous';
var pass_ftp        = 'anonymous@';
var port_ftp        = '21';
var parallel        = 10;
var isSFTP          = false;
var remote_folder   = '/public_html';

var globs = [
    // 'app/**',
    // 'app/' + js_Src + '*.js',
    // 'app/' + font_Src + '**',
    // 'app/' + libs_Src + '**',
    'app/' + html_Src + '*.html',
    'app/' + css_Src + '*'
];

function getFtpConnection() {
    return ftp.create({
        host:       host_ftp,
        user:       user_ftp,
        password:   pass_ftp,
        port:       port_ftp,
        secure:     isSFTP,
        parallel:   parallel,
        log:        gutil.log
    });
}


/*Error notify settings*/
var notifyInfo = {
    title: 'Gulp'
};
var plumberErrorHandler = {
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
    return gulp.src('app/' + css_Src + '*.css')
        .pipe(rename({extname: '.conv.scss'}))
        .pipe(gulp.dest('app/' + sass_Src));
});

/*Enable sass support + auto prefixer and source maps*/
gulp.task('sass', function () {
    return gulp.src('app/' + sass_Src + 'style.scss')
        .pipe(plumber(plumberErrorHandler))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], {cascade: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('app/' + css_Src))
        .pipe(browserSync.reload({stream: true}));
});

/*Enable bower dependencies*/
gulp.task('wiredep', function() {
    gulp.src('app/*.html')
        .pipe(wiredep({
            directory: 'app/' + libs_Src
        }))
        .pipe(gulp.dest('app/'));
});

/*Minify and combine script files*/
gulp.task('script:minify', function () {
    var js = gulp.src('app/' + js_Src + '**/*')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('app/' + js_Src));
    var libs = gulp.src('app/' + libs_Src + '**/*.js')
        .pipe(concat('libs.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('app/' + js_Src));
});

/*Minify styles and lib styles*/
gulp.task('css:minify', ['sass'], function () {
    var css = gulp.src('app/' + css_Src + '*.css')
        .pipe(cssnano())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('dist/' + css_Src));
    var libs = gulp.src('app/' + libs_Src + '**/*.css')
        .pipe(cssnano())
        .pipe(concat('libs.min.css'))
        .pipe(gulp.dest('dist/' + css_Src));
});

/*Clean styles from unused selectors*/
gulp.task('uncss', ['sass'], function () {
    return gulp.src('app/' + css_Src + '*.css')
        .pipe(uncss({
            html: ['app/' + html_Src + '*.html']
        }))
        .pipe(rename({suffix: '.un'}))
        .pipe(gulp.dest('dist/' + css_Src));
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
    return gulp.src('app/' + img_Src + '**/*')
        .pipe(cache(imagemin({
            interlaced: true,
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        })))
        .pipe(gulp.dest('dist/' + img_Src));
});

/*Ftp deploy*/
gulp.task('ftp-deploy', function () {
    var init_connect = getFtpConnection();

    return gulp.src('dist/**', {base: './dist/', buffer: false})
        .pipe(init_connect.newer(remote_folder))
        .pipe(init_connect.dest(remote_folder));
});

/*Enable watcher for remote server ftp*/
gulp.task('watch:remote', function() {
    browserSync({
        open: 'external',
        proxy: site_name,
        reloadDelay: 3500,
        notify: false
    });

    var init_connect = getFtpConnection();

    gulp.watch('app/' + sass_Src + '*.scss', ['sass']);
    gulp.watch(globs, browserSync.reload)
        .on('change', function(event) {
            return gulp.src([event.path], {base: './app/', buffer: false})
                .pipe(init_connect.newer(remote_folder))
                .pipe(init_connect.dest(remote_folder));
        });
    gulp.watch('bower.json', ['wiredep']);
});

/*Enable local watcher*/
gulp.task('watch:local', ['browser-sync'], function () {
    gulp.watch('app/' + sass_Src + '*.scss', ['sass']);
    gulp.watch('app/' + html_Src + '*.html', browserSync.reload);
    gulp.watch('app/' + js_Src + '**/*.js', browserSync.reload);
    gulp.watch('bower.json', ['wiredep'], browserSync.reload);
});

/*Build project for production*/
gulp.task('build', ['clean', 'img:minify', 'sass', 'css:minify', 'script:minify'], function () {

    var buildCss = gulp.src('app/' + css_Src + '*')
        .pipe(gulp.dest('dist/' + css_Src ));

    var buildLibs = gulp.src('app/' + libs_Src + '**/*')
        .pipe(gulp.dest('dist/' + libs_Src));

    var buildFonts = gulp.src('app/' + font_Src + '**/*')
        .pipe(gulp.dest('dist/' + font_Src));

    var buildJs = gulp.src('app/' + js_Src + '**/*')
        .pipe(gulp.dest('dist/' + js_Src));

    var buildHtml = gulp.src('app/' + html_Src + '*.html')
        .pipe(gulp.dest('dist/' + html_Src));
});