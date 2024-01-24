import NoSleep from 'nosleep.js'

import '../imports/startup/client/social.js';
import '../imports/startup/client/routes.js';

import '../imports/ui/utils.js';

// import users module
import '../imports/modules/users/client.js';

// import training sessions module
import '../imports/modules/training-sessions/client.js';

// import coaches module
import '../imports/modules/coaches/client.js';

// import live module
import '../imports/modules/live/client.js';

// import athletes module
import '../imports/modules/athletes/client.js';

// import administration module
import '../imports/modules/administration/client.js';

import '../imports/generic/summary';

import '../imports/modules/strava/client';


// First we get the viewport height and we multiple it by 1% to get a value for a vh unit
let vh = window.innerHeight * 0.01;
// Then we set the value in the --vh custom property to the root of the document
document.documentElement.style.setProperty('--vh', `${vh}px`);


if (!Meteor.isCordova) {
    // in iOS, this 1st click would cause a player to start with this video!
    document.addEventListener('click', function enableNoSleep() {
        const noSleep = new NoSleep();
        document.removeEventListener('click', enableNoSleep, false);
        noSleep.enable();
        window.document.myvideo = noSleep.noSleepVideo;
    }, false);
}