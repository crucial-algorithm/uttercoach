Package.describe({
  name: 'kimile:asteroid-facebook-connect',
  version: '0.0.7',
  // Brief, one-line summary of the package.
  summary: 'Meteor package providing support for Facebook Connect via Asteroid clients',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/kimile/asteroid-facebook-connect',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.addFiles('facebook.js', 'server');
});
