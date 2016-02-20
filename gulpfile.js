var gulp = require('gulp');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('scripts', function() {
    return gulp.src('throttled-queue.js')
        .pipe(rename('throttled-queue.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch('factory.js', ['scripts']);
});

gulp.task('default', ['scripts', 'watch']);