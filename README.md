# README #

Utter Coach web application for managing training sessions.

### DevOps info, if wanting to "recover" GoPaddler in the future ###

Check devops.md doc in root folder

### How do I get set up? ###

#### Clone this repository

    > git clone https://strikedaemon@bitbucket.org/strikedaemon/gopaddler-web.git

#### Load dependencies

    > meteor npm install

#### Change hosts file (@deprecated)

Add the following entry to your hosts file:

         127.0.0.1 local.gopaddler.com

This will allow Facebook authentication to work.

#### Set environment variables (@deprecated)

    > export ROOT_URL=http://local.gopaddler.com:3000
    > export SOCIAL_FACEBOOK_APP_KEY=<app-key>
    > export SOCIAL_FACEBOOK_APP_SECRET=<app-secret>

#### Run the server

    > npm run start

#### Run the tests

    > npm run coverage:watch 

Code coverage will start on the given port (most likely 3005), in the following URL (assuming localhost):

    > http://localhost:8080/coverage 


#### Facebook test users (@deprecated)

On the first run three users are created, with different profiles, so that all areas of the application can be tested.

```
Id: mzNME2AJWYXtMDoxc
Name: Karen Administrator
E-mail: karen_ibnedwm_administrator@tfbnw.net
Roles: [admin]
```
```
Id: 8KK8g5Y3QDCHu6tac
Name: James Coach
E-mail: james_rknjffn_coach@tfbnw.net
Roles: [coach]
```
```
Id: Q8PQgL6J6KgzCF2FJ
Name: John Athlete
E-mail: john_ehyxnrk_athlete@tfbnw.net
Roles: []
```

The best strategy is to open multiple incognito windows and login with different users to access different application areas.

### Deploying in a standalone MongoDB ###
(install mongo)

Enable replicaset (for access to oplog)
   replication:
      replSetName: rs0
      oplogSizeMB: 100

Start mongo
    systemctl start mongod

Login and initialize set
    Access shell using command mongo
    rs.initiate()

Restore a backup
    mongorestore paddler

# Mobile Apps #
During development, cordova folder is .meteor/local/cordova-build
 

## When is a new app release needed? ##
Meteor does hot swap of Javascript code in deployed apps automatically. So, only changes in icons, images or cordova 
plugins require deploy of new app.

## Development process ##
- Launch the app on a mobile device by running the following command(s), based on the platform you want to test:

`meteor run android-device`

`meteor run ios-device`

For running connected to our development environment:

`meteor run android-device --settings development.json --mobile-server=https://dev.gopaddler.com:443`

- Changes to the code should be pushed automatically to the device 

## Create release version ##
- Create a new git tag with the version of the code
- Run (3.0.8 is the tag created previously and utter-coach-settings.js contains the same JSON as the METEOR_SETTINGS variable in the server):

`meteor build ../builds/3.0.8 --server=https://app.uttercoach.com:443 --mobile-settings ../utter-coach-settings.js`

- Note: don't put utter-coach-settings.js in project folder, because it will be parsed by the meteor bundler causing exceptions in build

- Navigate to the folder, open versions for android and ios in Android Studio / Xcode and follow 
more up to date steps to publish an app.

> Note: review splash images in Xcode to confirm all images are there (currently, some images are added manually)

## Icon and splash screen management ##
Icons included in the project are based on the configuration on the mobile-config.js file. 
Source files are available in *app/icon.png, app/icon-foreground.png and app/splash.png*;

### Updating images in project ###
Instead of having to replace all the images in their different sizes manually, you can replace them automatically by 
changing the source files (section above) and running the replace-project-images script

`./app/replace-project-images`

All project files will be replaced by new images!

> Note: not all images are automatically incorporated by meteor... see following section to replace remaining images

### Reviewing images for each platform ###
#### Android ### 
Open project in Android Studio and generate the icon image again (that will make sure that all the icon versions are up-to-date to current standards).

`Resource Manager > Mip Map > + Image Asset `

`Foreground: app/icon-foreground.png (100% - its already on appropriate fitting)`

`Background: color, #212121`

#### iOS ###
Not all icons and splash screen sizes are currently supported by meteor. So, after generating a new build 
and confirming that there are missing images, the following script will generate the remaining image assets.

`app/replace-platform-images`
