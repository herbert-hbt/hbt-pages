#!/usr/bin/env node

// console.log("zhixingle~~~", process.argv);
process.argv.push("--cwd");
process.argv.push(process.cwd()); //命令执行所在路径
process.argv.push("--gulpfile");
process.argv.push(require.resolve("..")); //..会找到hbt-pages目录，再找package.json，会找到main字段，会找到bin/index.js
// console.log(process.argv);
require("gulp/bin/gulp");
