"use strict";

const path = require("path");
const gulp = require("gulp");
const clean = require("gulp-clean");
const typings = require("gulp-typings");
const tsc = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const merge = require("merge2");

gulp.task("default", ["build"]);
gulp.task("build", ["tsc"]);
gulp.task("rebuild", ["clean", "build"])

gulp.task("clean", () => {
    return gulp
        .src(['typings', 'dist'])
        .pipe(clean()); 
});

gulp.task('typings', () => {
    return gulp
        .src("./typings.json")
        .pipe(typings());    
});

gulp.task('tsc', ['typings'], () => {
    let tsResult = gulp
        .src(["src/**/*.ts"])
        .pipe(sourcemaps.init())
        .pipe(tsc(tsc.createProject("tsconfig.json")))

    return merge([
        tsResult.dts,
        tsResult.js.pipe(sourcemaps.write({
            sourceRoot: (file) => {
                return path.relative(file.relative, "./src");
            } 
        }))
    ])
    .pipe(gulp.dest("dist"));
});

gulp.task("watch", () => {
    return gulp.watch("src/**/*.ts", ['tsc']);
});