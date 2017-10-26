const LoggerPlugin = require('haste-plugin-wix-logger');
const paths = require('../../config/paths');
const {petriSpecsConfig} = require('../../config/project');
const {specs: testsGlob} = require('../globs');

module.exports = async configure => {
  const {run, watch, tasks} = configure({
    persistent: true,
    plugins: [
      new LoggerPlugin(),
    ],
  });

  const {clean, read, write, babel, sass, webpackDevServer, server, mocha, petriSpecs} = tasks;

  await run(clean({pattern: `${paths.build}/*`}));

  await Promise.all([
    run(
      read({pattern: `{${paths.src},${paths.test}}/**/*.js`}),
      babel(),
      write({target: paths.build}),
      server({serverPath: 'index.js'})
    ),
    run(
      read({pattern: `${paths.src}/**/*.scss`}),
      sass({
        includePaths: ['node_modules', 'node_modules/compass-mixins/lib']
      }),
      write({target: paths.build})
    ),
    run(
      read({
        pattern: [
          `${paths.assets}/**/*.*`,
          `${paths.src}/**/*.{ejs,html,vm}`,
          `${paths.src}/**/*.{css,json,d.ts}`,
        ]
      }),
      write({target: paths.build}, {title: 'copy-server-assets'})
    ),
    run(
      read({
        pattern: [
          `${paths.assets}/**/*.*`,
          `${paths.src}/**/*.{ejs,html,vm}`,
        ]
      }),
      write({target: paths.statics}, {title: 'copy-static-assets'})
    ),
    run(webpackDevServer({configPath: paths.config.webpack.development})),
    run(petriSpecs({config: petriSpecsConfig()}))
  ]);

  await run(
    read({pattern: testsGlob()}),
    mocha({
      requireFiles: [require.resolve('../../config/test-setup')],
      timeout: 30000,
    })
  );

  watch([`${paths.assets}/**/*.*`, `${paths.src}/**/*.{ejs,html,vm}`, `${paths.src}/**/*.{css,json,d.ts}`], changed => run(
    read(changed),
    write({target: paths.build})
  ));

  watch([`${paths.assets}/**/*.*`, `${paths.src}/**/*.{ejs,html,vm}`], changed => run(
    read(changed),
    write({target: paths.statics})
  ));

  watch(`${paths.src}/**/*.js`, changed => run(
    read({pattern: changed}),
    babel(),
    write({target: paths.build}),
    server({serverPath: 'index.js'})
  ));

  watch(`${paths.src}/**/*.scss`, changed => run(
    read({pattern: changed}),
    sass({
      includePaths: ['node_modules', 'node_modules/compass-mixins/lib']
    }),
    write({target: paths.build})
  ));

  watch(`${paths.src}/**/*.js`, () => run( // TODO - should also run on changes in specs
    read({pattern: `${paths.src}/**/*.spec.js`}),
    mocha({timeout: 30000})
  ));
};