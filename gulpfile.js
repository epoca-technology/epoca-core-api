const {src, dest, task, series} = require("gulp");
const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const minify = require("gulp-minify");
const clean = require("gulp-clean");




/*
* Compiles the typescript code into javascript.
*/
task("compile", () => {
    return tsProject.src().pipe(tsProject()).js.pipe(dest("dist"));
});





/*
* Compresses the javascript code.
*/
task("compress", () => {
    return src(["dist/**/*.js"])
        .pipe(minify({
            ext:{
                src:"-debug.js",
                min:".js"
            }
        }))
        .pipe(dest("dist"))
});




/**
 * Deletes the dist directory so the new code can be introduced.
 */
task("cleanDist", () => {
    return src("dist", {allowEmpty: true}).pipe(clean({force: true}));
});







/**
 * Default Task: Clean, Compile & Compress
 */
exports.default = series("cleanDist", "compile", "compress");