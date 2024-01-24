import {Template} from "meteor/templating";
import "./profile.html";
import "./profile.scss";
import "./zones.html";
import {Athlete} from "../../athletes/api/collections";
import 'bootstrap-daterangepicker';
import 'bootstrap-daterangepicker/daterangepicker.css';

const formTracker = new Tracker.Dependency();

Template.profileGeneral.onRendered(function () {

    const self = this;

    let /**@type Athlete */ athlete = self.data.athlete
        , $birthDate = $('#profile-birthdate')
        , $gender = $('#profile-select-gender')
        , $boat = $('#profile-select-boat')
        , $restingHeartRate = $('#profile-resting-heart-rate-input')
        , $maxHeartRate = $('#profile-max-heart-rate-input')
        , $saveButton = $('#profile-details-submit')
        , $formProfile = $('#form-profile')
        , $reloadButton = $('#profile-details-reload')
        , birthDate = athlete.birthDate
    ;

    $saveButton.on('click', function () {
        if ($saveButton.prop('disabled') === true) return;
        let gender = $gender.val();
        let boat = $boat.val();
        let restingHeartRate = parseInt($restingHeartRate.val());
        let maxHeartRate = parseInt($maxHeartRate.val());
        let birthDate = $birthDate.val();

        Meteor.call("updateAthleteProfile", athlete.id, gender, boat, restingHeartRate, maxHeartRate, birthDate, function (error, response) {
            athlete = Athlete.find(athlete.id);
        });
        $saveButton.prop('disabled', true);
    });

    $formProfile.on('change', function () {
        console.log('form changed', $formProfile[0].checkValidity());
        if ($formProfile[0].checkValidity()) {
            $saveButton.prop('disabled', false);
        }
    });

    $reloadButton.on('click', function () {
        formTracker.changed();
        $saveButton.prop('disabled', true);
    });

    $formProfile.on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    $birthDate.daterangepicker({
        opens: 'center',
        singleDatePicker: true,
        startDate: athlete.birthDate ? athlete.birthDate : moment().dayOfYear(180).add(-20, 'years'),
        showDropdowns: true,
        maxDate: moment().add(-5, 'years'),
        locale: {
            format: 'YYYY-MM-DD'
        }
    }, function (date) {
        birthDate = new Date(date.format('YYYY-MM-DD'));
    });

    if (!athlete.birthDate)
        $birthDate.val('');
});

Template.profileGeneral.helpers({
    gender: function () {
        formTracker.depend();
        const /**@type Athlete */ athlete = this.athlete;
        return athlete.gender;
    },

    birthdate: function () {
        formTracker.depend();
        const /**@type Athlete */ athlete = this.athlete;
        if (!athlete.birthDate) return '';
        return moment(athlete.birthDate).format("YYYY-MM-DD")
    },

    boat: function () {
        formTracker.depend();
        const /**@type Athlete */ athlete = this.athlete;
        return athlete.boat
    },

    restingHeartRate: function () {
        formTracker.depend();
        const /**@type Athlete */ athlete = this.athlete;
        return athlete.restingHeartRate
    },

    maxHeartRate: function () {
        formTracker.depend();
        const /**@type Athlete */ athlete = this.athlete;
        return athlete.maxHeartRate
    }
});

Template.profile.events({

    'click [data-action=accept]': function () {
        this.accept();
    },

    'click [data-action=deny]': function () {
        this.deny();
    },

    'click [data-action=remove]': function () {
        this.user().unfriend();
    }
});

Template.profileTabs.helpers({
    active: function (tab) {
        return this.tab === tab;
    }
});

Template.profileTabs.onCreated(function () {
});






