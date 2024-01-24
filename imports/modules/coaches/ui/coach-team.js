"use strict";

import { Meteor }             from 'meteor/meteor';
import Sortable               from 'sortablejs';
import i18n                   from '../../../utils/i18n';

import "./coach-team.scss";
import "./coach-team.html";
import {Coach, CoachAthleteGroup} from "../api/collections";
import {Modal} from "../../../utils/utils";
import {Athlete} from "../../athletes/api/collections";

let increaseCostDependency = new Tracker.Dependency()
    , increaseCost = 10;
let sortables = [], changes = 0, pendingUsers = {}, usersGroup = {};
/**@type Coach */
let coach = null;
const ATHLETES_LIMIT = 20;

/**
 *
 */
function initSortableGroups() {
    $('.sortable-group').each(function () {
        let isAcceptedAthletesGroup = $(this).is('.athletes-pending');
        let $this = $(this);
        $this.removeClass('not-yet-sortable');
        sortables.push(Sortable.create(this, {
            group: {
                name: 'athlete-group',
                put: !isAcceptedAthletesGroup
            },
            draggable: '.athlete',
            animation: 150,
            onStart: function (evt) {
                $('.athlete-group ').addClass('athlete-group-drag-highlight');
                $(evt.from).removeClass('athlete-group-drag-highlight');
            },
            onEnd: function () {
                $('.athlete-group ').removeClass('athlete-group-drag-highlight');
            },
            sort: !isAcceptedAthletesGroup,
            onAdd: function (event) {

                changes = 0;
                let $athlete = $(event.item);
                let athleteId = $athlete.data('id');
                let groupId = $(event.to).data('group-id');
                addAthleteToGroup(athleteId, groupId, pendingUsers[athleteId] === true);
            },
            onRemove: function (e) {

                if ($this.children().length === 0) {
                    $this.prev().find('.delete-icon').removeClass('hide');
                }
            }
        }));

    });
}

Template.coachTeam.onCreated(function () {
    coach = Coach.find(Meteor.userId());
});

Template.coachTeam.onRendered(function () {
    const self = this;
    const confirm = function (onDelete) {
        return function (e) {
            const $confirm = $('#confirm-delete-athlete');

            let $button = $(e.currentTarget);
            let $group = $button.closest('.athlete-group');
            let $athlete = $button.closest('.row.athlete.draggable');
            let athleteId = $button.data('user');
            let groupId = $group.data('group-id');

            let athleteName = null;
            let athlete = Athlete.find(athleteId);
            if (!athlete) {
                onDelete.apply(self, [athleteId, groupId]);
                $athlete.remove();
            } else {
                athleteName = athlete.name;
            }

            const message = i18n.translate('team_delete_confirm_message', [athleteName]);
            $confirm.find('.modal-body').empty().append($(`<p>${message}</p>`));
            $confirm.modal();

            $confirm.find('#delete-athlete').off('click').on('click', function () {
                onDelete.apply(self, [athleteId, groupId]);
                $athlete.remove();
                $confirm.modal('hide');
            });
        }
    };

    // delete athlete
    $('#groups').on('click.removeAthlete', '.coach-remove-athlete-from-team', confirm(function (athleteId, groupId) {

        Meteor.call('removeAthleteFromTeam', athleteId, function (err) {
            if (!err) return;

            let ack = Modal.factory('acknowledge', $('#remove-athlete-failed-modal'), {
                title: i18n.translate('team_remove_athlete_failed_title')
            });
            ack.show();
        });

    }));

    // don't accept athlete request
    $('.athletes-pending').on('click', '.coach-remove-athlete-from-team', confirm(function (athleteId) {
        Meteor.call('rejectAthleteRequest', athleteId, function (err) {
            console.log(err);
        });
    }));


    initSortableGroups();
});

Template.coachTeam.events({

    // allow groups to be collapsed
    'click .collapse-icon': function (event) {
        let collapseIconParent = $(event.currentTarget).parent();
        collapseIconParent.toggleClass('closed');
        collapseIconParent.next('.athlete-group').toggleClass('closed');
    },

    // create new group
    'click #new-group': function () {
        let newGroup = {
            name: ''
        };

        Meteor.call('saveCoachAthleteGroup', newGroup, function(err, id) {
            initSortableGroups();
            setTimeout(function () {
                $(`input[data-group-id="${id}"]`).focus();
            }, 0);
        });
    },

    'keypress .group-name': function (evt) {
        if (evt.which === 13) {
            $(evt.target).blur();
        }
    },

    // rename group
    'change .group-name': _.debounce(function (event) {
        let $input = $(event.target);
        Meteor.call('saveCoachAthleteGroup', { _id: $input.data('group-id'), name: $.trim($input.val()) });
    }, 300),

    'click [data-action=remove]': function () {
        this.cancel();
    },

    'click .delete-icon': function (event) {
        let id = $(event.target).data('group-id');
        Meteor.call('deleteCoachAthleteGroup', id);
        let $group = $('[data-group-id="' + id + '"]');

        $group.prev().remove();
        $group.remove();
    },

    'click .remove-athlete': function(event) {
        console.log('remove athlete');
    },

    'click #coach-team-invite-athletes-button': function(event) {
        event.preventDefault();
        Blaze.render(Template.coachInviteAthletes, document.getElementsByTagName('body')[0]);
    }

});

Template.coachTeam.helpers({

    groups: function () {
        return CoachAthleteGroup.findCoachGroups(Meteor.userId());
    },

    pendingAthletes: function() {
        if (coach === null) return [];

        if (Object.keys(pendingUsers).length === 0) {
            let pending = coach.athletesPending();
            for (let athlete of pending) {
                pendingUsers[athlete.id] = true;
            }
            return pending;
        }

        return coach.athletesPending();
    },

    amountIncrease: function () {
        increaseCostDependency.depend();
        return increaseCost;
    }
});

Template.coachTeamAthleteMobile.onCreated(function () {
    this.athleteId = this.data;
    indexGroups();
});

Template.coachTeamAthleteMobile.helpers({

    groups: function () {
        return CoachAthleteGroup.findCoachGroups(Meteor.userId());
    },

    athleteTeam: function () {
        return (usersGroup[this] || {}).name;
    },

    athleteTeamId: function () {
        return (usersGroup[this] || {}).id;
    },

    athleteInGroup: function () {
        let scope = Template.instance();
        return (usersGroup[scope.athleteId] || {}).id === this._id;
    },

    isNotMe: function () {
        return Meteor.userId() !== this;
    },

    athlete: function() {
      return {
          athleteId: this
      }
    },

    amountIncrease: function () {
        increaseCostDependency.depend();
        return increaseCost;
    }
});

Template.coachTeamAthlete.helpers({
    isNotMe: function () {
        return Meteor.userId() !== this;
    },
});

Template.coachTeamAthleteMobile.events({
    /* CHANGE ATHLETE GROUP */
    'click .swap-to-group': function (e) {
        e.stopPropagation();
        console.log('group');
        let $group = $(e.target)
            , $menu = $group.closest('.dropdown-menu')
            , $athlete = $group.closest('.athlete-mobile')
            , groupId = $group.data('group')
            , athleteId = $menu.data('athlete');

        $menu.find('.current-group').removeClass('current-group');
        $group.find('i').addClass('current-group');
        $athlete.find('.athlete-team').text($group.text());

        addAthleteToGroup(athleteId, groupId, pendingUsers[athleteId] === true);
        // Router.go('athlete', {_id: this});
    },

    /* OPEN ACTIONS DROPDOWN */
    'click .athlete-actions-drop-down': function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        $(e.currentTarget).dropdown('toggle');
    },

    /* NAVIGATE */
    'click .athlete-mobile': function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        Router.go('athlete', {_id: this});
    },

    /* DELETE */
    'click .menu-remove-athlete': function (e) {
        e.stopPropagation();
        let athleteId = this;
        console.log('remove');

        if (pendingUsers[athleteId]) {
            Meteor.call('rejectAthleteRequest', athleteId, function (err) {
                console.log(err);
            });
        } else {
            Meteor.call('removeAthleteFromTeam', athleteId, function (err) {
                if (!err) return;

                let ack = Modal.factory('acknowledge', $('#remove-athlete-failed-modal'), {
                    title: i18n.translate('team_remove_athlete_failed_title')
                });
                ack.show();
            });
        }
        return false;
    }
});

Template.coachInviteAthletesInfo.helpers({});


function indexGroups() {
    const groups = CoachAthleteGroup.findCoachGroups(Meteor.userId());
    usersGroup = {};
    for (const group of groups) {
        const athletes = group.athletes;
        for (const athleteId of athletes) {
            usersGroup[athleteId] = {id: group.id, name: group.name};
        }
    }
}

function addAthleteToGroup(athleteId, groupId, isNewInTeam = false) {

    if (!isNewInTeam) return Meteor.call('swapAthlete', athleteId, groupId);

    if (CoachAthleteGroup.coachNbrOfAthletes(Meteor.userId()) >= ATHLETES_LIMIT) {
        let ack = Modal.factory('acknowledge', $('#account-limited-modal'), {
            title: i18n.translate('team_account_limited_title')
        });
        ack.show();
        return;
    }

    Meteor.call('isAddingAnAthleteToTeamGoingToIncreaseCost', function (err, amount) {
        if (err) {
            return console.error(err);
        }

        if (amount) {
            increaseCost = amount;
            increaseCostDependency.changed();
            let confirm = Modal.factory(Modal.types().CONFIRM, $('#increased-charges'), {
                title: i18n.translate('team_modal_increase_costs_warning_title'),
                primary: {
                    label: i18n.translate('team_modal_increase_costs_warning_action'),
                    callback: function () {
                        Meteor.call('acceptAthleteRequestToJoinTeam', athleteId, groupId, function (err, result) {
                            if (err) return console.error(err);
                            confirm.hide();
                        });
                    }
                },
                secondary: {
                    label: i18n.translate('modal_discard')
                }
            });
            confirm.show();
            return;
        }

        Meteor.call('acceptAthleteRequestToJoinTeam', athleteId, groupId, function (err, result) {
            if (err) console.error(err);
            else {
                console.log('result')
            }
        });
    });
}
