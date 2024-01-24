'use strict';

import './coach-live-splits.html';
import './coach-live-splits.scss';
import {Router} from "meteor/iron:router";

import {LiveSessionSplits, LiveSession, LiveSplitSummary} from "../api/collections";
import {Modal, Utils} from "../../../utils/utils";
import i18n from "../../../utils/i18n";

let activeSplitId = null;

Template.coachLiveSplits.onCreated(function () {
    activeSplitId = this.data.activeSplitId;
});

Template.coachLiveSplits.onRendered(function () {
    let self = this;
    let $modal = $('#select-split')
        , summary = null;
    App.drawChart(LiveSplitSummary.findOne({split: this.data.activeSplitId, device: this.data.activeAthleteId}));

    $('div[data-selector="back"]').off('click').on('click', function () {
        Router.go('coachLiveSession', {sessionId: self.data.sessionId});
    });

    const modal =  Modal.factory(Modal.types().CONFIRM, $modal, {
        title: i18n.translate("coach_live_split_select_split"),
        primary: {
            label: i18n.translate('modal_acknowledge')
        },
        extraCss: "coach-live"
    });

    $('#coach-live-splits-menu').off('click').on('click', function () {
        $modal.find('[split="'+ self.data.activeSplitId +'"]').addClass('selected');
        modal.show().then(() => {
            modal.$modal.off('click').on('click', 'li', function () {
                let $ul = modal.$modal.find('ul');
                let $li = $(this);
                $ul.find('.selected').removeClass('selected');
                $li.addClass('selected');
                summary = LiveSplitSummary.findOne({_id: $li.data('summary')});
                modal.hide().then(() => {
                    if (!summary) return;
                    Router.go('coachLiveSplits', {
                        sessionId: summary.liveSession,
                        athlete: summary.device,
                        split: summary.split
                    });
                });
            });
        })
    });


    const $tableBody = $('.coach-live-splits-table-body');
    setTimeout(function () {
        const offset = $tableBody.offset();
        if (!offset) return;

        const heightLimit = $(document).innerHeight() - offset.top - 8;
        if ($tableBody.height() > heightLimit) {
            $tableBody.height(heightLimit);
        }
    }, 100);

});

Template.coachLiveSplits.onDestroyed(function () {
});

Template.coachLiveSplits.helpers({
    splits: function () {
        return LiveSplitSummary.find({device: this.activeAthleteId}, {sort: {number: 1}});
    },

    sessionId: function () {
        return this.sessionId
    },

    isActiveSplit: function(split) {
        console.log(activeSplitId);
        return activeSplitId === split;
    },

    splitId: function () {
        return activeSplitId;
    },

    athletes: function () {
        let session = LiveSession.find(this.sessionId);
        if (!session)
            return;

        return session.devices;
    },

    showAthletes: function(){
        let session = LiveSession.find(this.sessionId);
        if (!session)
            return false;

        return session.devices.length > 1;
    },

    isActiveAthlete: function(id) {
        return id === this.activeAthleteId
    },

    getSplitSummary: function () {
        return LiveSplitSummary.findOne({split: this.activeSplitId, device: this.activeAthleteId});
    },

    splitNumber: function () {
        let split = LiveSessionSplits.findOne({_id: this.activeSplitId});
        return split.number / 2 + 1;
    },

    getSplitNumber: function (splitId) {
        return LiveSessionSplits.findOne({_id: splitId}).number / 2 + 1
    },

    partials: function () {
        let summary = LiveSplitSummary.findOne({split: this.activeSplitId, device: this.activeAthleteId});
        return summary.partials;
    },

    formatDistanceLabels: function (value) {
        return Math.round(value);
    },

    isLastPartial: function (distance) {
        let summary = LiveSplitSummary.findOne({split: this.activeSplitId, device: this.activeAthleteId});
        if (summary.partials.length === 0)
            return true;

        return summary.partials[summary.partials.length - 1].distance === distance;
    },

    formatZeroDecimalPlaces: function (value) {
        return Math.round(value);
    },

    formatTwoDecimalPlaces: function (value) {
        return Math.round(value * 100) / 100
    },

    getAvgSpeed: function (distance, duration) {
        let speed = distance / 1000 / (duration / 1000 / 60 / 60);
        return Math.round(speed * 100) / 100;
    },

    formatDuration: function (milis) {
        return Utils.formatDurationInHundredth(milis);
    },

    humanDistance: function(distance) {
        return Math.round(distance);
    }


});

class App {
    constructor() {
    }

    static drawChart(summary) {
        if (!summary) return;


        let options = {
            chart: {
                type: 'area',
                inverted: true,
                backgroundColor: 'transparent',
                margin: [0, 0, 0, 0],
                selectionMarkerFill: 'transparent'
            },
            title: {text: '', align: 'left', y: 5},
            credits: {enabled: false},
            legend: {enabled: false},
            colors: ['#666AAB'],
            xAxis: {
                visible: false,
                crosshair: false,
                type: 'datetime',
                gridLineColor: '#D9D9D9',
                labels: {
                    enabled: false
                },
                min: 0.5, max: summary.speed.length - 1.5
            },
            plotOptions: {
                series: {
                    fillOpacity: .5,
                    pointWidth: 5,
                    borderColor: 'transparent',
                    marker: {
                        enabled: true,
                        fillColor: 'transparent',
                        states: {
                            select: 'none'
                        }
                    },
                    lineColor: '#cccccc',
                    lineWidth: 2,

                    states: {
                        hover: {
                            enabled: false
                        }
                    }
                },

                line: {
                    dataLabels: {
                        enabled: true
                    }
                }
            },
            yAxis: {
                visible: false,
                title: {text: ''},
                labels: {enabled: true},
                crosshair: false
            },
            tooltip: {
                enabled: false,
            },
            events: {
                click: function(e) {
                    e.preventDefault();
                    return false;
                }
            }
        };

        if (summary.maxSpeed.position === 0) {
            summary.maxSpeed.position = summary.speed.length > 2 ? 1 : 0;
        }

        if (summary.maxSpeed.position === summary.speed.length - 1) {
            summary.maxSpeed.position = summary.speed.length > 3 ? summary.speed.length - 2 : 0;
        }

        let maxSpeed = Math.max(summary.speed[summary.maxSpeed.position], summary.maxSpeed.value);

        options.series = [{
            name: "speed", color: "#CCCCD3"
            , data: summary.speed || []
        }, {
            linkedTo: "speed", color: "#505284", data: [{x: summary.maxSpeed.position,
                y: maxSpeed,
                marker: {
                    radius: 6,
                    lineColor: '#505284',
                    fillColor: '#505284',
                    lineWidth: 1,
                    symbol: 'circle'
                }
            }]
        }];
        $('.coach-live-splits-table-body-speed')
            .css({'height': (summary.partials.length * 80 + 'px')}).highcharts(options)
    }
}


