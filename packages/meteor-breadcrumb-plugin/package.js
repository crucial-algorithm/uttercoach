Package.describe({
    name: 'strikedaemon:iron-router-breadcrumb',
    summary: 'This package will provide a easy way to add a breadcrumb to Iron.Router with enough flexibility.',
    version: '1.0.0',
    git: 'https://github.com/strikedaemon/meteor-breadcrumb-plugin'
});

function configurePackage(api) {

    if (api.versionsFrom) {
        api.versionsFrom('METEOR@0.9.0');
    }

    // Core Dependencies
    api.use(
        [
            'blaze@2.0.0',
            'templating@1.0.5',
            'ui',
            'underscore',
            'meteor'
        ]
    );

    api.use('iron:router@1.0.1', 'client');

    api.addFiles('lib/breadcrumb.js');
    api.addFiles('lib/breadcrumb.html');

    api.export('Breadcrumb');
}

Package.onUse(function (api) {
    configurePackage(api);
});
