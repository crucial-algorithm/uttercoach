/**
 * Facebook
 */
ServiceConfiguration.configurations.remove({
    service: 'facebook'
});

ServiceConfiguration.configurations.insert({
    service: 'facebook',
    appId: process.env.SOCIAL_FACEBOOK_APP_KEY,
    secret: process.env.SOCIAL_FACEBOOK_APP_SECRET
});


/**
 * Profile avatar settings.
 */
Avatar.setOptions({
    fallbackType: "initials"
});
