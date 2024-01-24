'use static';
import "./join-coach-team.html";
import "./join-coach-team.scss"
import {InviteToJoinGoPaddler} from "../api/collections";
import {Coach} from "../../coaches/api/collections";
import UtterCoachSettings from "../../../utils/settings";

Template.appLinkJoinCoachTeam.onCreated(function () {
    Meteor.subscribe('joinGoPaddlerToken', this.data.token);
});

Template.appLinkJoinCoachTeam.onRendered(function () {
    $('')
});


Template.appLinkJoinCoachTeam.helpers({
    coach: function () {
        const invite = InviteToJoinGoPaddler.findByToken(this.token);
        if (!invite) return;
        return Coach.find(invite.from);
    },

    appName: function() {
        /**@type Coach */
        const coach = this;
        return UtterCoachSettings.getInstance().getAppName(coach.sport);
    },

    androidLink() {
        /**@type Coach */
        const coach = this;
        return UtterCoachSettings.getInstance().getAppAndroidLink(coach.sport)
    },
    iOSLink() {
        /**@type Coach */
        const coach = this;
        return UtterCoachSettings.getInstance().getAppIOSLink(coach.sport)
    },

    appImagePreview() {
        /**@type Coach */
        const coach = this;
        return UtterCoachSettings.getInstance().getAppImagePreview(coach.sport)
    }
});


Template.appLinkJoinCoachTeam.events({
    'click .join-coach-team-coach-id': function (e) {
        console.log('click found');
        const $code = $(e.currentTarget).find('.code'), content = $code.text();
        $code.off('copy').on('copy', function (event) {
            event.preventDefault();
            const clipboard = event.originalEvent.clipboardData;
            if (clipboard) {
                clipboard.setData("text/plain", content);
                console.log(clipboard.getData("text"))
            }
        });

        document.execCommand("copy")
    }
});
