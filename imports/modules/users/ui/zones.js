'use static';
import "./zones.html";
import "./zones.scss";
import {Athlete} from "../../athletes/api/collections";
import {Template} from "meteor/templating";
import {Utils} from "../../../utils/utils";
import {CoachUtils} from "../../coaches/api/utils";
import i18n from "../../../utils/i18n";
import {Coach} from "../../coaches/api/collections";

/**
 *
 * @type {Athlete}
 */
let athlete = null
    , athleteDependency = new Tracker.Dependency()
;

Template.profileZones.onRendered(function () {

    athlete = Athlete.find(this.data.athleteId);
    athleteDependency.changed();

    const self = this
        , user = self.data.athlete
        , $addRow = $('[data-selector="add-row"]')
        , $tableBody = $("table tbody")
        , $saveZones = $('[data-selector="save-zones"]')
        , $reloadZones = $('[data-selector="reload-zones"]');

    let isAddDisabled = false;

    // populate start based on last input of previous row
    $tableBody.on('change', '.input-zone-end', function () {

        let position = parseInt($(this).closest("tr").data("index"))
            , zones = getActiveZones()
            , value = parseInt($(this).val())
        ;

        zones[position] = {start: zones[position].start, end: value};

        if (position + 1 <= zones.length - 1) {
            zones[position + 1] = {start: value + 1, end:zones[position + 1].end};
        }


        athleteDependency.changed();

    });

    $saveZones.on('click', function () {

        let method = null, intervals = getIntervals().map(function (r) {
            return {
                start: r.start,
                end: r.end
            }
        });

        if (getActiveZone() === "heart-rate") {
            method = "updateHeartRateZones"
        }

        if (getActiveZone() === "stroke-rate") {
            method = "updateStrokeRateZones"
        }

        if (getActiveZone() === "speed") {
            method = "updateSpeedZones"
        }

        Meteor.call(method, athlete.id, intervals, function (error, response) {
            athlete = Athlete.find(athlete.id);
        })
    });

    // remove action
    $tableBody.on('click', '.zones-remove-row-btn' ,  function () {
        const $btn = $(this), $row = $btn.closest("tr"), position = $row.data('index');

        let zones = getActiveZones();
        zones.splice(position, 1);

        athleteDependency.changed();
    });

    $addRow.on('click', function () {
        if (isAddDisabled === true) return;

        let zones = getActiveZones();
        let last = zones[zones.length - 1];
        if (getActiveZone() === "stroke-rate" || getActiveZone() === "speed"){let last = zones[zones.length - 1];
            if (last === undefined) {
                zones.push({start: 0, end: null});
            } else {
                zones.push({start: isNaN(last.end + 1) ? null : last.end + 1, end: Infinity})
            }}

        if(getActiveZone() === "heart-rate"){ if (last === undefined) {
            zones.push({start: 0, end: null});
        } else {
            zones.push({start: isNaN(last.end + 1) ? null : 99, end: 99})
        }}


        athleteDependency.changed();
    });

    $reloadZones.on('click' , function () {
        athlete = Athlete.find(athlete.id);
        athleteDependency.changed();
    });

    function tabClickedHandler() {
        const $li = $(this);
        $zoneTabs.find('.active').removeClass('active');
        $li.addClass('active');
        athleteDependency.changed();
    }

    let $zoneTabs = $('#zones-tabs');
    $zoneTabs.on('click', '.page-item', tabClickedHandler);

    tabClickedHandler.apply($('[data-tab="heart-rate"]'), []);

    initZonesReplication();
});

Template.profileZones.helpers({
    zones: function() {
        athleteDependency.depend();
        return getActiveZones();
    },

    isRowLimitReached: function() {
        athleteDependency.depend();
        let zones = getActiveZones();
        if (zones.length === 0) return false;
        let last = zones[zones.length - 1];
        if(getActiveZone() === "heart-rate" && last.start >=99) return true;
        return getActiveZones().length >= 12;
    },

    saveButtonStatus: function() {
        athleteDependency.depend();

        if (athlete === null) return 'disabled';

        const record = Athlete.find(athlete.id);
        let areZonesEqual = function (a, b) {
            if (a.length !== b.length) return false;
            for (let i = 0, l = a.length; i < l; i++) {
                if (a[i].start !== b[i].start || a[i].end !== b[i].end) {
                    return false;
                }
            }
            return true;
        };

        let base;
        if (getActiveZone() === undefined) return 'disabled';
        if (getActiveZone() === "heart-rate")
            base = record.heartRateZones;

        if (getActiveZone() === "stroke-rate")
            base = record.strokeRateZones;

        if (getActiveZone() === "speed")
            base = record.speedZones;


        if (areZonesEqual(getActiveZones(), base) === true) {
            return 'disabled';
        } else {
            return '';
        }

    },

    replicateZone: function () {
        const coach = Coach.find(Meteor.userId());
        return coach.athleteIds();
    },

    errorMsg: function () {
        athleteDependency.depend();
        let zones = getActiveZones();
        let lastPosition = zones.length - 1;

        if (getActiveZone() !== "heart-rate") return '';

        for (let position = 0; position < zones.length; position++) {
            if (zones[position].end >= 99 && position !== lastPosition) {
                return i18n.translate("athlete_zone_save_error");
            }
        }
        return '';
    }
});

Template.zoneIntervalTemplate.helpers({

    isZoneInvalid() {
        let zones = getActiveZones();
        let interval = zones[this.index], previous = zones[this.index - 1];

        if (interval.start > interval.end) return true;

        if(getActiveZone() === "heart-rate") {
            if (interval.end >= 99 && this.index !== getActiveZones().length - 1){
                return true;
            }
        }

        if (!previous) return false;

        if(interval.start === Infinity && interval.end === Infinity) return true;

        return previous.end + 1 !== interval.start


    },

    isLast() {
        return this.index === getActiveZones().length - 1
    },

    endValue() {
        if (this.index === getActiveZones().length - 1) return null;
        return this.end;
    },

    zoneLabel() {

        if ((isNaN(this.end) || this.end === Infinity) && this.start === Infinity){
            return "..."
        }

        if ((isNaN(this.end) || this.end === 99) && this.start === Infinity){
            return "..."
        }

        if ((isNaN(this.end) || this.end === 99) && this.start > 99){
            return "..."
        }

        if (isNaN(this.end) || this.end === Infinity) {
            return " >= " + this.start
        }

        if ((!isNaN(this.start)) && (isNaN(this.end) || this.end === 99)) {
            return `${this.start} - 100`
        } else {
            return `${this.start} - ${this.end}.99`
        }
    },

});

/**
 * Retrieve active tab
 * @returns {string}
 */
function getActiveZone() {
    return $('#zones-tabs').find('.active').data('tab');
}

function getIntervals() {
    let intervals = [], $trs = $("table tbody tr");

    $trs.each(function () {
        const $tr = $(this);
        let $start = $tr.find('[name="start"]')
            , $end = $tr.find('[name="end"]')
            , start = parseInt($start.val())
            , end = parseInt($end.val());


        if(getActiveZone() === "heart-rate") {
            intervals.push({
                start: isNaN(start) ? 0 : start,
                end: isNaN(end) ? 99 : end,
                $tr: $tr
            });
        } else {
            intervals.push({
                start: isNaN(start) ? 0 : start,
                end: isNaN(end) ? Infinity : end,
                $tr: $tr
            });
        }

    });

    return intervals;
}

function getActiveZones() {
    if (athlete === null) return [];
    if (getActiveZone() === "heart-rate")
        return athlete.heartRateZones;

    if (getActiveZone() === "stroke-rate")
        return athlete.strokeRateZones;

    if (getActiveZone() === "speed")
        return athlete.speedZones;

    return []
}

/**
 *
 * @returns {string[]}
 */
function getSelectedAthletes() {
    let athletesSelected = [], $divReplicateZones = $('.zones-replicate-to-athlete.selected');

    $divReplicateZones.each(function () {
        athletesSelected.push($(this).data('id'));
    });

    return athletesSelected;
}


function initZonesReplication() {

    const self = this
        , $open = $('[data-selector="add-athletes"]')
        , $modal = $('#zone-add-athletes-modal')
        , $discard = $('#discard')
        , $apply = $('#create');


    $open.on('click', function () {
        $('.zones-replicate-to-athlete.selected').removeClass("selected");
        $apply.prop('disabled', true);
        Utils.dialog($modal);
    });

    $discard.on('click', function () {
        $modal.modal("hide");
    });

    $modal.find('.modal-body').on('click', '.zones-replicate-to-athlete', function () {
        $(this).toggleClass('selected');
        if ($modal.find('.zones-replicate-to-athlete.selected').length > 0) {
            $apply.prop('disabled', false);
        } else {
            $apply.prop('disabled', true);
        }
    });

    $apply.on('click', function () {

        let method = null, intervals = getIntervals().map(function (r) {
            return {
                start: r.start,
                end: r.end
            }
        });

        //return;
        if (getActiveZone() === "heart-rate") {
            method = "updateAthletesHeartRateZones"
        }

        if (getActiveZone() === "stroke-rate") {
            method = "updateAthletesStrokeRateZones"
        }

        if (getActiveZone() === "speed") {
            method = "updateAthletesSpeedZones"
        }

        $apply.prop('disabled', true);

        Meteor.call(method, getSelectedAthletes(), intervals, function (error, response) {
            athlete = Athlete.find(athlete.id);
            $apply.prop('disabled', false);
            $modal.modal("hide");
        });

    });
}