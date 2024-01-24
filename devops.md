# DevOps #

Trying to capture how app.uttercoach.com used to be deployed. This document was written 3 years after last deployment,
so it may not be accurate.

## Infrastructure ##

```text
# User: utter
# Home: /opt/utter

# OS: Ubuntu 21.04 (GNU/Linux 5.11.0-31-generic x86_64)
# Mongo: 5.0.2
# Node: v12.17.0 


# ls /opt/utter

-rw-rw-r--  1 utter utter   419 Dec 25 20:55 README
drwxrwxr-x  5 utter users    58 Oct  8  2021 builds
-rw-rw-r--  1 utter utter  1452 Aug 29  2021 config.json
drwxrwxr-x  5 utter users    75 Oct  8  2021 deploys
drwxrwxr-x 10 jrego users  4096 Aug 29  2021 jobs   --> https://github.com/crucial-algorithm/utter-jobs (does not look like it's being used)  
drwxrwxr-x  2 utter users 53248 Dec 25 00:00 logs
drwxrwxr-x 12 utter users  4096 Aug 29  2021 repo   --> https://github.com/crucial-algorithm/uttercoach
drwxrwxr-x  5 utter users   145 Oct  8  2021 scripts
-rw-rw-r--  1 utter utter  2059 Aug 29  2021 uttercoach.service


# ls /opt/utter/

# cat README
config.json stores the configuration file for METEOR_SETTINGS, writting into /etc/systemd/system/gopaddler.service

Use this command to convert into a single line
sed ':a;N;$!ba;s/\n/ /g' config.json | sed 's/ \+//g'

Replace:
sudo vi /etc/systemd/system/gopaddler.service

Reload:
sudo systemctl daemon-reload

Restart:
sudo systemctl restart gopaddler.service


Note: gopaddler.service is actually uttercoach.service


# cat config.json
{
  "stripe": {
    "plan": "plan_Fre2U6huwlcLVa",
    "coupon": "two-months-free",
    "secret_key": "<setup_another_in_stripe>",
    "webhook_signing_secret": "<setup_another_in_stripe>"
  },
  "aggregate_batch_size": 10,
  "create_stripe_customer_batch_size": 10,
  "strava": {
    "gopaddler": {
      "secret": "<setup_another_in_strava>",
      "client_id": 51861
    },
    "uttercycling": {
      "secret": "<setup_another_in_strava>",
      "client_id": 51859
    }
  },
  "maps": {
    "key": "<setup_another_in_whatever_tool>",
    "batch_size": 10
  },
  "activity_report": {
    "schedule": "at_13:30",
    "address": "reports@gopaddler.com"
  },
  "dont_run_batch": false,
  "public": {
    "stripe": {
      "publishable_key": "<setup_another_in_stripe>"
    },
    "sports": {
      "canoeing": {
         "app_name": "GoPaddler",
         "app_preview": "canoeing.gif",
         "app_link_android": "https://play.google.com/store/apps/details?id=com.gopaddler.app",
         "app_link_ios": "itms-apps://itunes.apple.com/pt/app/gopaddler/id1149602167?l=en&mt=8"
      },
      "cycling": {
         "app_name": "Utter Cycling",
         "app_preview": "cycling.png",
         "app_link_android": "https://play.google.com/store/apps/details?id=com.uttercoach.cycling",
         "app_link_ios": "itms-apps://itunes.apple.com/us/app/id1525860877?l=en&mt=8"
      }
    }
  }
}


# cat /etc/systemd/system/uttercoach.service
[Service]
ExecStart=/opt/utter/.nvm/versions/node/v12.17.0/bin/node /opt/utter/deploys/latest/bundle/main.js
Restart=always
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gopaddler
User=utter
Group=users
Environment=NODE_ENV=production
Environment=PWD=/data/meteor/deploys/latest
Environment=HOME=/opt/utter
Environment=PORT=3000
Environment=HTTP_FORWARDED_COUNT=1
Environment=BIND_IP=127.0.0.1
Environment=MONGO_URL=mongodb://127.0.0.1:27017/admin?replicaSet=rs0
Environment=ROOT_URL=https://app.uttercoach.com
Environment=SOCIAL_FACEBOOK_APP_KEY=529853143847598
Environment=SOCIAL_FACEBOOK_APP_SECRET=3277612099d721f871812600d58ea686
Environment=SLACK_NOTIFICATION_URL=https://hooks.slack.com/services/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
Environment=LOG_FILE=/opt/utter/logs/utter.log
Environment=LOG_LEVEL=debug
Environment=METEOR_SETTINGS='{"stripe":{"plan":"plan_Fre2U6huwlcLVa", ...}}'


# crontab -l
# m h  dom mon dow   command

* * * * * /opt/utter/scripts/jobs/notifications.sh >> /opt/utter/logs/notifications.log
0 8 * * * /opt/utter/scripts/jobs/daily-report.sh   > /opt/utter/logs/daily-report.log
0 * * * * /opt/utter/scripts/jobs/users-audit.sh   > /opt/utter/logs/users-audit.log

```



## Deploy process (untested - 3 years since latest attempt)  ##
1. Tag the version we want to deploy on git
2. run `deploy.sh <git tag>`

```bash
utter@utter:~/deploys$ ls -ltr
total 0
drwxrwxr-x 3 utter users 27 Aug 29  2021 3.1.1
drwxrwxr-x 3 utter users 27 Aug 30  2021 3.1.2
drwxrwxr-x 3 utter users 27 Oct  8  2021 3.1.3
lrwxrwxrwx 1 utter utter  5 Oct  8  2021 latest -> 3.1.3
utter@utter:~/deploys$ cd ../builds
utter@utter:~/builds$ ls -ltr
total 0
drwxrwxr-x 2 utter users 32 Aug 29  2021 3.1.1
drwxrwxr-x 2 jrego jrego 24 Aug 30  2021 3.1.2
drwxrwxr-x 2 jrego jrego 32 Oct  8  2021 3.1.3
```



## Configuration of HTTP server ## 
Check http server for contents of these files.
```bash
root@utter:/etc/nginx/conf.d# ls -ltr
total 28
-rw-r--r-- 1 root root 1856 Aug 29  2021 ws.uttercoach.com.conf
-rw-r--r-- 1 root root 1857 Aug 29  2021 app.uttercoach.com.conf
-rw-r--r-- 1 root root 2074 Aug 29  2021 static.gopaddler.com.conf
-rw-r--r-- 1 root root  864 Aug 29  2021 gopaddler.redirect.bkp
-rw-r--r-- 1 root root 1866 Oct  5  2021 app.gopaddler.com.conf
-rw-r--r-- 1 root root 1857 Oct  8  2021 dev.uttercoach.com.conf
-rw-r--r-- 1 root root  834 May  2  2023 crucial-algorithm.com.conf
```
