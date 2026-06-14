const grunt = require("grunt");
const pkg = require("./package.json");
const config = require("./plugin-config.json");
const loadGruntTasks = require("load-grunt-tasks");

// Define files to include in the release package
// CRITICAL: Order matters! Includes first, then exclusions
const distFiles = [
  // ============================================================
  // INCLUDES - Specify exactly what to include
  // ============================================================
  "assets/**",
  "config/**",
  "database/**",
  "includes/**",
  "languages/**",
  "libs/**",
  "vendor/**",          // CRITICAL: Composer dependencies
  "views/**",
  "LICENSE",
  "readme.txt",
  "ready-pos.php",      // CRITICAL: Main plugin file
  "plugin.php",         // CRITICAL: Plugin class file
  "uninstall.php",
  
  // ============================================================
  // EXCLUSIONS - Remove what we don't need
  // ============================================================
  
  // Source files (already compiled to assets/)
  "!src/**",
  
  // Development directories
  "!artworks/**",
  "!artifacts/**",
  "!bin/**",
  "!bower_components/**",
  "!documentation/**",
  "!docs/**",
  "!node_modules/**",
  "!packages/**",
  "!release/**",
  "!test-results/**",
  "!tests/**",
  "!**/node_modules/**",
  "!**/test",
  "!**/tests/**",
  
  // IDE and tooling directories
  "!.github/**",
  "!.kiro/**",
  "!.storybook/**",
  "!.vscode/**",
  "!**/.github/**",
  "!**/.git/**",
  "!**/vite-dev-server.json",
  
  // Config files (not needed in production)
  "!.DS_Store",
  "!.editorconfig",
  "!.env",
  "!.env.*",
  "!.gitignore",
  "!.gitattributes",
  "!.gitkeep",
  "!.jshintrc",
  "!.prettierignore",
  "!.prettierrc.json",
  "!bower.json",
  "!components.json",
  "!composer.json",
  "!composer.lock",
  "!gruntfile.cjs",
  "!package.json",
  "!package-lock.json",
  "!phpcs.xml.dist",
  "!phpstan.neon.dist",
  "!phpunit.xml.dist",
  "!plugin-config.json",
  "!postcss.config.js",
  "!postcss.config.cjs",
  "!tailwind.config.js",
  "!tsconfig.json",
  "!vite.admin.config.js",
  "!vite.config.js",
  "!vite.frontend.config.js",
  "!webpack.config.js",
  "!yarn.lock",
  "!**/*~",
  "!**/.gitkeep",
  
  // Documentation files
  "!*.md",
  "!CLAUDE.md",
  "!contributing.md",
  "!LICENSE-CREDENTIALS-SETUP.md",
  "!readme.md",
  "!ROADMAP.md",
  "!SECURITY.md",
  "!UPGRADE-NOTICE.md",
  
  // WordPress config files (never include these)
  "!wp-config.php",
  "!wp-config-local.php",
  "!wp-config-sample.php",
  
  // Map files (not needed in production)
  "!**/*.js.map",
  "!**/*.css.map",
  "!assets/**/*.js.map",
  "!assets/**/*.css.map",
  "!assets/admin/dist/**/*.js.map",
  "!assets/frontend/dist/**/*.js.map",
  "!js/dist/assets/**/*.js.map",
  
  // Vendor development files
  "!vendor/bin/**",
];

// Replace functionality
var replace = require("replace"),
  _ = grunt.util._,
  log = grunt.log;

grunt.registerMultiTask("sed", "Search and replace.", function () {
  var data = this.data;

  if (!data.pattern) {
    log.error("Missing pattern property.");
    return;
  }

  if (_.isUndefined(data.replacement)) {
    log.error("Missing replacement property.");
    return;
  }

  data.path = data.path || ".";

  replace({
    regex: data.pattern,
    replacement: data.replacement,
    paths: _.isArray(data.path) ? data.path : [data.path],
    recursive: data.recursive,
    quiet: grunt.option("verbose") ? false : true,
    silent: false,
    async: false,
  });
});

// Initialize Grunt configuration
grunt.initConfig({
  pkg,
  move: {
    rename_plugin_file: {
      src: "ready-pos.php",
      dest: config.plugin_file_name,
    },
  },
  sed: {
    change_plugin_name: {
      pattern: "WordPress Plugin Boilerplate",
      replacement: config.plugin_name,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_plugin_description: {
      pattern: "A boilerplate for WordPress plugins.",
      replacement: config.plugin_description,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_author_name: {
      pattern: "Prappo",
      replacement: config.author_name,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_author_uri: {
      pattern: "https://prappo.github.io",
      replacement: config.author_uri,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_version: {
      pattern: "Version: [0-9]+\\.[0-9]+\\.[0-9]+",
      replacement: `Version: ${config.plugin_version}`,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_plugin_text_domain: {
      pattern: "Text Domain: ready-pos",
      replacement: `Text Domain: ${config.text_domain}`,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_composer_namespace: {
      pattern: "WordPressPluginBoilerplate",
      replacement: config.namespace,
      path: "composer.json",
      recursive: false,
    },
    change_plugin_file_namespace: {
      pattern: "namespace WordPressPluginBoilerplate",
      replacement: `namespace ${config.namespace}`,
      recursive: false,
      path: "plugin.php",
    },
    change_plugin_file_namespace_use: {
      pattern: "use WordPressPluginBoilerplate",
      replacement: `use ${config.namespace}`,
      recursive: false,
      path: "plugin.php",
    },
    change_main_file_namespace: {
      pattern: "namespace WordPressPluginBoilerplate",
      replacement: `namespace ${config.namespace}`,
      recursive: false,
      path: config.plugin_file_name,
    },
    change_main_file_namespace_use: {
      pattern: "use WordPressPluginBoilerplate",
      replacement: `use ${config.namespace}`,
      recursive: false,
      path: config.plugin_file_name,
    },
    change_includes_namespace: {
      pattern: "namespace WordPressPluginBoilerplate",
      replacement: `namespace ${config.namespace}`,
      recursive: true,
      path: "includes",
    },
    change_includes_namespace_use: {
      pattern: "use WordPressPluginBoilerplate",
      replacement: `use ${config.namespace}`,
      path: "includes",
      recursive: true,
    },
    change_includes_namespace_in_use: {
      pattern: "WordPressPluginBoilerplate",
      replacement: `${config.namespace}`,
      path: "includes",
      recursive: true,
    },
    change_database_namespace: {
      pattern: "namespace WordPressPluginBoilerplate",
      replacement: `namespace ${config.namespace}`,
      recursive: true,
      path: "database",
    },
    change_database_namespace_in_use: {
      pattern: "WordPressPluginBoilerplate",
      replacement: `${config.namespace}`,
      path: "database",
      recursive: true,
    },
    change_database_namespace_use: {
      pattern: "use WordPressPluginBoilerplate",
      replacement: `use ${config.namespace}`,
      path: "database",
      recursive: true,
    },
    change_libs_namespace: {
      pattern: "namespace WordPressPluginBoilerplate",
      replacement: `namespace ${config.namespace}`,
      recursive: true,
      path: "libs",
    },
    change_libs_namespace_use: {
      pattern: "use WordPressPluginBoilerplate",
      replacement: `use ${config.namespace}`,
      path: "libs",
      recursive: true,
    },
    change_functions_prefix: {
      pattern: "wordpress_plugin_boilerplate_",
      replacement: `${config.plugin_prefix}_`,
      path: "includes",
      recursive: true,
    },
    change_main_class_name: {
      pattern: "WordPressPluginBoilerplate",
      replacement: config.main_class_name,
      path: [config.plugin_file_name, "plugin.php"],
      recursive: false,
    },
    change_main_function_name: {
      pattern: "wordpress_plugin_boilerplate_init",
      replacement: config.main_function_name,
      path: config.plugin_file_name,
      recursive: false,
    },
    change_constant_prefix: {
      pattern: "WORDPRESS_PLUGIN_BOILERPLATE_",
      replacement: config.constant_prefix + "_",
      path: [config.plugin_file_name, "includes", "plugin.php"],
      recursive: true,
    },
  },

  checktextdomain: {
    options: {
      text_domain: config.text_domain,
      correct_domain: true,
      keywords: [
        "__:1,2d",
        "_e:1,2d",
        "_x:1,2c,3d",
        "esc_html__:1,2d",
        "esc_html_e:1,2d",
        "esc_html_x:1,2c,3d",
        "esc_attr__:1,2d",
        "esc_attr_e:1,2d",
        "esc_attr_x:1,2c,3d",
        "_ex:1,2c,3d",
        "_n:1,2,4d",
        "_nx:1,2,4c,5d",
        "_n_noop:1,2,3d",
        "_nx_noop:1,2,3c,4d",
        "wp_set_script_translations:1,2d",
        "load_plugin_textdomain:1d,2,3",
      ],
    },
    files: {
      src: [
        "includes/**/*.php",
        "includes/function.php",
        "views/*.php",
        config.plugin_file_name,
        "uninstall.php",
        "plugin.php",
      ],
      expand: true,
    },
  },

  // Task to copy files to the release directory
  copy: {
    main: {
      expand: true,
      src: distFiles,
      dest: "release/ready-pos",
    },
  },

  // Task to delete .js.map files
  clean: {
    mapFiles: ["release/ready-pos/js/dist/assets/**/*.js.map"],
    // Stale Vite dev-server markers left behind by `vite dev` runs.
    // The v4wp manifest loader prefers this file over the production
    // manifest.json, which causes a blank page in production. Remove
    // them from the dist folders before packaging the release.
    devMarkers: {
      src: [
        "assets/admin/dist/vite-dev-server.json",
        "assets/frontend/dist/vite-dev-server.json",
      ],
    },
  },

  // Task to compress the release directory into a zip file
  compress: {
    main: {
      options: {
        mode: "zip",
        archive: `./release/ready-pos.zip`,
      },
      expand: true,
      src: distFiles,
      dest: "/ready-pos",
    },
    version: {
      options: {
        mode: "zip",
        archive: `./release/ready-pos-${pkg.version}.zip`,
      },
      expand: true,
      src: distFiles,
      dest: "/ready-pos",
    },
    todocs: {
      options: {
        mode: "zip",
        archive: `./documentation/public/plugin/ready-pos.zip`,
      },
      expand: true,
      src: distFiles,
      dest: "/ready-pos",
    },
  },
});

// Load all grunt tasks automatically
loadGruntTasks(grunt);

// Register 'release' task to copy files and create a zip archive
grunt.registerTask("release", [
  "clean:devMarkers",
  "copy:main",
  "compress:main",
  "compress:version",
  "compress:todocs",
  "clean:mapFiles",
]);

grunt.registerTask("rename", [
  "move:rename_plugin_file",
  "sed:change_plugin_name",
  "sed:change_plugin_description",
  "sed:change_plugin_text_domain",
  "sed:change_author_name",
  "sed:change_author_uri",
  "sed:change_version",
  "sed:change_composer_namespace",
  "sed:change_main_file_namespace",
  "sed:change_main_file_namespace_use",
  "sed:change_includes_namespace",
  "sed:change_includes_namespace_use",
  "sed:change_includes_namespace_in_use",
  "sed:change_database_namespace",
  "sed:change_database_namespace_in_use",
  "sed:change_database_namespace_use",
  "sed:change_libs_namespace",
  "sed:change_libs_namespace_use",
  "sed:change_plugin_file_namespace",
  "sed:change_plugin_file_namespace_use",
  "sed:change_functions_prefix",
  "sed:change_main_class_name",
  "sed:change_main_function_name",
  "sed:change_constant_prefix",
]);

grunt.registerTask("change-text-domain", ["checktextdomain"]);

// Set linefeed style to Unix (LF)
grunt.util.linefeed = "\n";

module.exports = grunt;
