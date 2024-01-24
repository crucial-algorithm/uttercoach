App.info({
    id: 'com.uttercoach',
    version: '2.0.0',
    name: 'Utter Coach',
    description: 'Utter Coach',
    author: 'Utter Coach',
    email: 'filipe@uttercoach.com',
    website: 'https://uttercoach.com'
});


App.accessRule('https://static.gopaddler.com');
App.accessRule('https://fonts.googleapis.com');
App.accessRule('https://fonts.gstatic.com');
App.accessRule('https://cdnjs.cloudflare.com');
App.accessRule('https://js.stripe.com');
App.accessRule('https://secure.gravatar.com');


App.appendToConfig(`
    <allow-navigation href="https://*.stripe.com/*" /> 
`);
App.appendToConfig(`
    <allow-navigation href="https://m.stripe.network/*" /> 
`);
App.appendToConfig(`
    <allow-navigation href="https://iplist.cc/api/*" /> 
`);
console.log('process ROOT_URL is already set', process.env.ROOT_URL);
App.appendToConfig(`
    <allow-navigation href="${process.env.ROOT_URL}/*" /> 
`);

App.appendToConfig(`
    <preference name="BackupWebStorage" value="local" /> 
`);



App.icons({
      'android_mdpi': 'app/icons/android/mipmap-mdpi/ic_launcher.png'
    , 'android_hdpi': 'app/icons/android/mipmap-hdpi/ic_launcher.png'
    , 'android_xhdpi': 'app/icons/android/mipmap-xhdpi/ic_launcher.png'
    , 'android_xxhdpi': 'app/icons/android/mipmap-xxhdpi/ic_launcher.png'
    , 'android_xxxhdpi': 'app/icons/android/mipmap-xxxhdpi/ic_launcher.png'

    , 'app_store': 'app/icons/ios/1024.png'
    , 'iphone_2x': 'app/icons/ios/120.png'
    , 'iphone_3x': 'app/icons/ios/180.png'
    , 'ipad_2x': 'app/icons/ios/152.png'
    , 'ipad_pro': 'app/icons/ios/167.png'
    , 'ios_settings_2x': 'app/icons/ios/58.png'
    , 'ios_settings_3x': 'app/icons/ios/87.png'
    , 'ios_spotlight_2x': 'app/icons/ios/80.png'
    , 'ios_spotlight_3x': 'app/icons/ios/120.png'
    , 'ios_notification_2x': 'app/icons/ios/40.png'
    , 'ios_notification_3x': 'app/icons/ios/60.png'
    , 'ipad': 'app/icons/ios/76.png'
    , 'ios_settings': 'app/icons/ios/29.png'
    , 'ios_spotlight': 'app/icons/ios/40.png'
    , 'ios_notification': 'app/icons/ios/20.png'
    , 'iphone_legacy': 'app/icons/ios/57.png'
    , 'iphone_legacy_2x': 'app/icons/ios/114.png'
    , 'ipad_spotlight_legacy': 'app/icons/ios/50.png'
    , 'ipad_spotlight_legacy_2x': 'app/icons/ios/100.png'
    , 'ipad_app_legacy': 'app/icons/ios/72.png'
    , 'ipad_app_legacy_2x': 'app/icons/ios/144.png'
});


App.launchScreens({
      'iphone5': 'app/launch/ios/640x1136.png'
    , 'iphone6': 'app/launch/ios/750x1334.png'
    , 'iphone6p_portrait': 'app/launch/ios/1242x2208.png'
    , 'iphone6p_landscape': 'app/launch/ios/2208x1242.png'
    , 'iphoneX_portrait': 'app/launch/ios/1125x2436.png'
    , 'iphoneX_landscape': 'app/launch/ios/2436x1125.png'
    , 'ipad_portrait_2x': 'app/launch/ios/1536x2048.png'
    , 'ipad_landscape_2x': 'app/launch/ios/2048x1536.png'
    , 'iphone': 'app/launch/ios/320x480.png'
    , 'iphone_2x': 'app/launch/ios/640x960.png'
    , 'ipad_portrait': 'app/launch/ios/768x1024.png'
    , 'ipad_landscape': 'app/launch/ios/1024x768.png'

    , 'android_mdpi_portrait': 'app/launch/android/drawable-mdpi/screen.png'
    , 'android_mdpi_landscape': 'app/launch/android/drawable-land-mdpi/screen.png'
    , 'android_hdpi_portrait': 'app/launch/android/drawable-hdpi/screen.png'
    , 'android_hdpi_landscape': 'app/launch/android/drawable-land-hdpi/screen.png'
    , 'android_xhdpi_portrait': 'app/launch/android/drawable-xhdpi/screen.png'
    , 'android_xhdpi_landscape': 'app/launch/android/drawable-land-xhdpi/screen.png'
    , 'android_xxhdpi_portrait': 'app/launch/android/drawable-xxhdpi/screen.png'
    , 'android_xxhdpi_landscape': 'app/launch/android/drawable-land-xxhdpi/screen.png'
    , 'android_xxxhdpi_portrait': 'app/launch/android/drawable-xxxhdpi/screen.png'
    , 'android_xxxhdpi_landscape': 'app/launch/android/drawable-land-xxxhdpi/screen.png'
});

