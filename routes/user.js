const express = require('express');
const router = express.Router();
const request = require("request");

function userMidleware(req, res, next) {
    function getToken(next) {
        const options = {
            method: 'POST',
            url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
            headers: {
                'content-type': 'application/json'
            },
            body: `{"client_id": "${process.env.AUTH0_SERVER_CLIENT_ID}", "client_secret": "${process.env.AUTH0_SERVER_CLIENT_SECRET}","audience": "https://${process.env.AUTH0_DOMAIN}/api/v2/","grant_type":"client_credentials"}`
        };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            next(JSON.parse(body).access_token);
        });
    }

    function getUserMeta(token, userId) {
        const options = {
            method: 'GET',
            url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}?include_fields=false`,
            headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${token}`
            },
        }

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            const result = JSON.parse(body);

            req.user.name = result.given_name
            req.user.surname = result.family_name
            req.user.city = result.user_metadata.city
            req.user.state = result.user_metadata.state
            req.user.zip = result.user_metadata.zip

            next();
        });
    }

    function updateUserMeta(token, userId, user, next) {
        const options = {
            method: 'PATCH',
            url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}`,
            headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                "user_metadata": {
                    "city": user.city,
                    "state": user.state,
                    "zip": user.zip
                }
            })
        }

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            next();
        });
    }

    req.user.save = function (data, next) {
        getToken(token => updateUserMeta(token, req.user._json.sub, data, next))
    }

    getToken(token => getUserMeta(token, req.user._json.sub))
}

router.get('/', userMidleware, function (req, res) {
    res.render('user', req.user);
})

router.post('/', userMidleware, function (req, res) {
    req.user.save({
        city: req.body.city,
        state: req.body.state,
        zip: req.body.zip
    }, function () {
        res.render('user', Object.assign(req.user, req.body));
    });
});

module.exports = router;