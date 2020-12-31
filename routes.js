const express = require('express');
const router = express.Router();
const assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

//serve sign in page
router.get('/', async function(req, res, next){
    res.render('sign_in');
});

//serve sign up page
router.get('/signup_page', async function(req, res, next){
    res.render('sign_up');
});

//serve study page
router.get('/study', async function(req, res, next){
    if (req.query.user == undefined || req.query.user == '') {
        //check that the user is logged in
        res.redirect('/routes/');
    }
    else {
        //req.query has user
        //making array of today and the next 6 days
        var today = new Date();
        var week_array = [];
        week_array.push(today);
        for(var i=1; i<7; i++) {
            const new_day = new Date();
            new_day.setDate(today.getDate() + i)
            week_array.push(new_day)
        }
        //get users study sessions
        const db = req.app.locals.db;
        var sessionsCursor = db.collection('studyTimes').find({"email" : {$eq: req.query.user}});
        var sessionsArray = [];
        await sessionsCursor.forEach((doc) => {
            doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
            doc.startTime = doc.startTime.toString().slice(0,5);
            doc.endTime = doc.endTime.toString().slice(0,5);
            sessionsArray.push(doc);
        });
        //want to pass to client: date:"m/d", "start_time": "00:00", "end_time": "00:00", satisfied?: "True"/"False"
        res.render('study', {daysArray: week_array, sessionsArr: sessionsArray, user: req.query.user});
    }
});

//serve motivate page
router.get('/motivate', async function(req, res, next){
    res.render('motivate');
});

//add Study Session
router.route('/addStudyTime')
    .post(function(req, res, next) {
        const db = req.app.locals.db;
        console.log(req.body.startTime);
        var dateArr = req.body.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        var doc = {
            email: req.body.email,
            date: parseInt(dateString),
            startTime: req.body.startTime,
            endTime: req.body.endTime
        };
        console.log(doc);
        db.collection('studyTimes').insertOne(doc, function(err, result) {
            assert.equal(null, err);
            console.log('doc inserted');
        });
        res.redirect('/routes/study?user=' + req.body.email);     
    });

//edit Study Session
router.route('/editStudyTime')
    .post(function(req, res, next) {
        const db = req.app.locals.db;
        var dateArr = req.body.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        var newvalues = {$set: {email: req.body.email, date: parseInt(dateString), startTime: req.body.startTime, endTime: req.body.endTime}};
        db.collection('studyTimes').updateOne({"_id": ObjectId(req.body.id)}, newvalues, function(err, result) {
            assert.equal(null, err);
            console.log('doc edited');
        });
        res.redirect('/routes/study?user=' + req.body.email);     
    });

//sign up logic
router.route('/signup')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        if (req.body.password.length < 8) { //password less than 8 chars
            res.redirect('/routes/signup_page?passwordShort=True');
        }
        else if (req.body.password != req.body.confirmPassword) { //passwords don't match
            res.redirect('/routes/signup_page?passwordsMatch=False');
        }
        else {
            var exists = 0;
            var existsCursor = db.collection('users').find({"email" : {$eq: req.body.email}})
            await existsCursor.forEach(function(doc, err) {
                exists++;
            });
            if (exists > 0) {
                //this email already has an account
                res.redirect('/routes/signup_page?userExists=True'); 
            }
            else { //all good, create account
                const item = {
                    email: req.body.email,
                    password: req.body.password
                }
        
                db.collection('users').insertOne(item, function(err, result) {
                    assert.equal(null, err);
                    console.log('user inserted');
                });
                res.redirect('/routes/?accountCreated=True');
            }
        }
});

//sign in logic
router.route('/sign_in')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        var exists = 0;
        var dbPassword = '';
        var existsCursor = db.collection('users').find({"email" : {$eq: req.body.email}})
        await existsCursor.forEach(function(doc, err) {
            exists++;
            dbPassword = doc.password;
        });
        if (exists <= 0) {
            //no account exists with this email
            res.redirect('/routes/?accountExists=False'); 
        }
        else { //all good, create account
            if (req.body.password == dbPassword) {
                res.redirect('/routes/study?user=' + req.body.email);
            }
            else {
                res.redirect('/routes/?passwordIncorrect=True'); 
            }
        }
});

module.exports = router;


function zeroFormat(hour) {
    hour = hour.toString();
    if (hour.length == 1) {
        return "0" + hour.toString();
    }
    else {
        return hour.toString();
    }
}