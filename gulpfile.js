"use strict";

const gulp = require("gulp");
const clean = require("gulp-clean");
const typings = require("gulp-typings");
const tsc = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");

gulp.task("default", ["build"]);
gulp.task("build", ["tsc"]);
gulp.task("rebuild", ["clean", "build"])

gulp.task("clean", () => {
    return gulp
        .src(['typings', 'maps', 'dist'])
        .pipe(clean()); 
});

gulp.task('typings', () => {
    return gulp
        .src("./typings.json")
        .pipe(typings());    
});

gulp.task('tsc', ['typings'], () => {
    return gulp
        .src(["src/**/*.ts"])
        .pipe(sourcemaps.init())
        .pipe(tsc(tsc.createProject("tsconfig.json")))
        .pipe(sourcemaps.write("../maps", { sourceRoot: "../src" }))
        .pipe(gulp.dest("dist")); 
});

gulp.task("watch", () => {
    return gulp.watch("src/**/*.ts", ['tsc']);
});