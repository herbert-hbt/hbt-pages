const { src, dest, parallel, series, watch } = require("gulp");
const plugins = require("gulp-load-plugins")();
const path = require("path");
const del = require("del");

const cwd = process.cwd(); //此目录是命令行运行时的目录，和当前项目目录没有关系
let config = {
  //可以防止默认配置
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      pages: "*.html",
      scripts: "assets/scripts/*.js",
      styles: "assets/styles/*.scss",
      images: "assets/images/**",
      fonts: "assets/fonts/**",
    },
  },
};

/**
 *
 *
 *
 * 样式模块
 *
 *
 *
 **/
const style = () => {
  //  base: "src" 指定打包之后目录结构也会有
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.sass({ outputStyle: "expanded" })) //默认不会处理下划线开头的文件
    .pipe(dest(config.build.temp));
};

/**
 *
 *
 *
 * 脚本模块
 *
 *
 *
 **/
const script = () => {
  return (
    src(config.build.paths.scripts, {
      base: config.build.src,
      cwd: config.build.src,
    })
      // .pipe(plugins.babel({ presets: ["@babel/preset-env"] })) //若果babel()中不穿presets，就会几乎不会有转换，bebal只是一个平台，需要各种插件来实现功能
      .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
      .pipe(dest(config.build.temp))
  ); //presets是指一些插件的集合
};

/**
 *
 *
 *
 * 模板模块
 *
 *
 *
 **/

try {
  const loadingConfig = require(path.join(cwd, "hbt-pages.config.js"));
  config = { ...config, ...loadingConfig };
} catch (e) {}
const page = () => {
  return src(config.build.paths.pages, {
    base: config.build.src,
    cwd: config.build.src,
  }) //可以使用"src/**/*.html",来通配所有的HTML文件
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) //此处需要设置cache，否则不会及时更新
    .pipe(dest(config.build.temp));
};

/**
 *
 *
 *
 * 图片模块
 *
 *
 *
 **/
const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.temp));
};

/**
 *
 *
 *
 * 文字模块
 *
 *
 *
 **/
const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin()) //imagemin也可用于字体文件的压缩
    .pipe(dest(config.build.temp));
};

/**
 *
 *
 *
 * 其他文件
 *
 *
 *
 **/
const extra = () => {
  return src("**", {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist));
};

/**
 *
 *
 *
 * dist删除
 *
 *
 *
 **/
const clean = () => {
  return del([config.build.dist, config.build.temp]); //返回一个promise
};

/**
 *
 *
 *
 * 开发服务器
 *
 *
 *
 **/
const browserSync = require("browser-sync");
const { use } = require("browser-sync");
const bs = browserSync.create();
const serve = () => {
  //此处是监测文件变化之后，重新执行编译任务，编译过后导致dist文件发生变化，引发浏览器重载
  watch(config.build.paths.styles, { cwd: config.build.src }, style);
  watch(config.build.paths.scripts, { cwd: config.build.src }, script);
  watch(config.build.paths.pages, { cwd: config.build.src }, page);
  // watch('src/assets/images/**',image);//对于图片、字体和公共文件，编译的效果只是文件压缩，在开发阶段，不必要一定做，
  // watch('src/assets/fonts/**',font);//但是要做两件事1.变化了浏览器重新刷新(reload发方法)，2.浏览器依赖的应该是源代码中的文件，设置server的baseDir
  // watch('public/**',extra);
  watch("**", { cwd: config.build.public }, bs.reload); //此处则是是监测文件变化之后，重新刷新浏览器
  watch(
    [config.build.paths.images, config.build.paths.fonts, "public/**"],
    { cwd: config.build.src },
    bs.reload
  ); //此
  bs.init({
    notify: false, //是否通知
    port: 4900, //设置端口
    open: false, //是否自动打开浏览器
    files: config.build.dist + "/**", //指定监听的文件，只是dist下文件修改后，重新加载，也可以在编译的过程中，使用提供的reload api
    server: {
      baseDir: [config.build.temp, config.build.dist, config.build.public], //会依次查找数组中对应文件夹的资源
      routes: {
        //遇到路径/node_modules，先去加载node_modules，一旦有请求，优于dist响应
        "/node_modules": "node_modules",
      },
    },
  });
};

/**
 *
 *
 *
 * 引用相关
 *
 *
 *
 **/

const useref = () => {
  return (
    src(config.build.paths.pages, {
      base: config.build.temp,
      cwd: config.build.temp,
    })
      .pipe(plugins.useref({ searchPath: [config.build.temp, "."] }))
      //此处有html js css三种文件
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true, //如果不配collapseWhitespace，只会压缩空白字符
            minifyCSS: true, //会压缩内联的css
            minifyJS: true, //会压缩script标签内的js
          })
        )
      )
      // .pipe(dest("release")) //如果还放置到dist中去，就可能发生输入输出流之间的冲突
      .pipe(dest(config.build.dist)) //优化后
  );
};

const complile = parallel(style, script, page);

const build = series(
  clean,
  parallel(series(complile, useref), image, font, extra)
);

const dev = series(complile, serve);

module.exports = {
  clean,
  build,
  dev,
};
