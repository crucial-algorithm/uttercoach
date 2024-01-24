import './users.html';
import {Coach} from "../../coaches/api/collections";


const usersDependency = new Tracker.Dependency();

const TABS = {
    LATEST: 'latest',
    COACHES: 'coaches'
};

Template.administrationUsers.onRendered(function () {

    let $tabs = $('#navigation');

    function tabClickedHandler() {
        const $li = $(this);
        $tabs.find('.active').removeClass('active');
        $li.addClass('active');
        usersDependency.changed();
    }

    $tabs.on('click', '.page-item', tabClickedHandler);
    $('[data-tab="latest"]').click();
});


Template.administrationUsers.helpers({
    users: function () {
        usersDependency.depend();

        let active = $('#navigation').find('.active').data('tab');
        function sort(a, b) {
            if (a.ts > b.ts) return 1;
            if (a.ts < b.ts) return -1;
            return 0
        }

        if (active === TABS.COACHES) {
            let coaches = Coach.all();
            return coaches.map((coach) => {
                return {id: coach.id, name: coach.name, email: coach.email
                    , createdAt: moment(coach.createdAt).fromNow()
                    , ts: coach.createdAt
                }
            }).sort(sort).reverse();
        }



        if (active === TABS.LATEST) {
            let users = Meteor.users.find({}).fetch();
            return users.map((user) => {
                return {
                    id: user._id,
                    name: user.profile.name,
                    email: user.profile.email,
                    createdAt: moment(user.createdAt).fromNow(),
                    ts: user.createdAt ? user.createdAt.getTime() : new Date("1970-01-01T00:00:00")
                }
            }).sort(sort).reverse();
        }

        return []
    }
});
