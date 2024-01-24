"use strict";

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import {Router, RouteController} from 'meteor/iron:router';

import './login.scss';
import './login.html';

Template.forgotPassword.events({
    'click #at-btn': function (event) {
        event.preventDefault();
        const email = $('input').val();
        if (!email) return;
        const $error = $('.at-error');
        $error.hide();
        Meteor.call('nbResetPassword', email, (err) => {
            console.log(err);
            if (!err) return Router.go('/');
            $error.show();
        })
    }
});

function showHidePassword() {
    const $password = $('#at-field-password');
    const $toggle = $('<span class="fa fa-fw fa-eye field-icon toggle-password"></span>');
    $password.after($toggle);

    $toggle.click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        $(this).toggleClass("fa-eye fa-eye-slash");
        if ($password.attr("type") === "password") {
            $password.attr("type", "text");
        } else {
            $password.attr("type", "password");
        }
        $password.focus();

        $password[0].selectionStart = $password[0].selectionEnd = $password.val().length
    });
}

Template.login.onRendered(showHidePassword);
Template.createAccount.onRendered(showHidePassword);