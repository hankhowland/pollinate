const express = require('express');
const router = express.Router();
const assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var nodemailer = require('nodemailer');

//GLOBAL UTILITY VARS
var today = new Date();
var mongoToday = today.getFullYear().toString()+zeroFormat(today.getMonth())+zeroFormat(today.getDate());
var cost_per_hour = 6;

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
        var week_array = makeWeekArray();
        //get users study sessions
        const db = req.app.locals.db;

        var sessionsCursor = db.collection('studyTimes').find(
            {$and: [
                {"date": {$gte: parseInt(mongoToday)}},
                {"email": {$eq: req.query.user}}
            ]}   
        );
        var sessionsArray = [];
        await sessionsCursor.forEach((doc) => {
            doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
            doc.startTime = doc.startTime.toString().slice(0,5);
            doc.endTime = doc.endTime.toString().slice(0,5);
            sessionsArray.push(doc);
        });

        var mySessionsCursor = db.collection('meetings').find({"studierEmail": {$eq: req.query.user}});
        var mySessionsArray = [];
        await mySessionsCursor.forEach((doc) => {
            //find corresponding studyTime in sessionsArray
            for (i in sessionsArray) {
                var session = sessionsArray[i]
                if (session._id == doc.studyTimeID) {
                    doc.startTime = session.startTime;
                    doc.endTime = session.endTime;
                    doc.date = session.date;
                }
            }
            if ((doc.date != undefined) && (dateStringToInt(doc.date) >= parseInt(mongoToday))) {
                mySessionsArray.push(doc)
            }
        })
        //want to pass to client: date:"m/d", "start_time": "00:00", "end_time": "00:00", satisfied?: "True"/"False"
        res.render('study', {daysArray: week_array, sessionsArr: sessionsArray, user: req.query.user, myMeetings: mySessionsArray});
    }
});

//serve motivate page
router.get('/motivate', async function(req, res, next){
    var week_array = makeWeekArray();
    //get all sessions where user != current user, date >= today, and motivator != 0
    const db = req.app.locals.db;

    //available sessions
    var sessionsCursor = db.collection('studyTimes').find(
        {$and: [
            {"date": {$gte: parseInt(mongoToday)}},
            {"email": {$ne: req.query.user}},
            {"motivator": {$ne: 1}}
        ]}   
    );
    var sessionsArray = [];
    await sessionsCursor.forEach((doc) => {
        doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
        doc.startTime = doc.startTime.toString().slice(0,5);
        doc.endTime = doc.endTime.toString().slice(0,5);
        //finding cost of session
        var length = (parseInt(doc.endTime.split(':')[0])*60 + parseInt(doc.endTime.split(':')[1])) - (parseInt(doc.startTime.split(':')[0])*60 + parseInt(doc.startTime.split(':')[1])) 
        doc.cost = Math.ceil((length/60)*cost_per_hour);
        if (doc.cost < cost_per_hour) {doc.cost = cost_per_hour;}
        sessionsArray.push(doc);
    });

    //my confirmed meetings
    var mySessionsCursor = db.collection('meetings').find({"motivatorEmail": {$eq: req.query.user}});
    var mySessionsArray = [];
    var cursor = db.collection('studyTimes').find(
        {$and: [
            {"date": {$gte: parseInt(mongoToday)}},
            {"email": {$ne: req.query.user}},
        ]}   
    );
    var utilArray = [];
    await cursor.forEach((doc) => {
        doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
        doc.startTime = doc.startTime.toString().slice(0,5);
        doc.endTime = doc.endTime.toString().slice(0,5);
        utilArray.push(doc);
    });
    await mySessionsCursor.forEach(async function(doc) {
        for (i in utilArray) {
            var sesh = utilArray[i];
            if (sesh._id == doc.studyTimeID) {
                sesh = utilArray[i];
                doc.date = sesh.date;
                doc.startTime = sesh.startTime;
                doc.endTime = sesh.endTime;
            }
        }
        if (doc.date != undefined) {
            mySessionsArray.push(doc);
        }
    });
    res.render('motivate', {sessions: sessionsArray, daysArray: week_array, myMeetings: mySessionsArray});
});

//add Study Session
router.route('/addStudyTime')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        var dateArr = req.body.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        var doc = {
            email: req.body.email,
            date: parseInt(dateString),
            startTime: req.body.startTime,
            endTime: req.body.endTime
        };
        var startInt = parseInt(doc.startTime.split(':')[0]) + parseInt(doc.startTime.split(':')[1]);
        var endInt = parseInt(doc.endTime.split(':')[0]) + parseInt(doc.endTime.split(':')[1]);
        if (startInt < endInt) {
            await db.collection('studyTimes').insertOne(doc, function(err, result) {
                assert.equal(null, err);
                console.log('doc inserted');
            });
        }
        res.redirect('/routes/study?user=' + req.body.email);     
    });

//edit Study Session
router.route('/editStudyTime')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        var dateArr = req.body.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        var newvalues = {$set: {email: req.body.email, date: parseInt(dateString), startTime: req.body.startTime, endTime: req.body.endTime}};
        await db.collection('studyTimes').updateOne({"_id": ObjectId(req.body.id)}, newvalues, function(err, result) {
            assert.equal(null, err);
            console.log('doc edited');
        });
        res.redirect('/routes/study?user=' + req.body.email);     
    });

//delete Study Session
//add Study Session
router.get('/deleteSession', async function(req, res, next) {
    const db = req.app.locals.db;
    await db.collection('studyTimes').deleteOne({"_id": ObjectId(req.query.id)}, function(err, result) {
        assert.equal(null, err);
        console.log('doc deleted');
    });
    res.redirect('/routes/study?user=' + req.query.email);     
});

//make meeting from motivate page
router.get('/confirmMotivate', async function(req, res, next) {
        //enter req.body into meetings table
        //find studyTime and make "motivator": 1
        const db = req.app.locals.db;
        await db.collection('meetings').insertOne(req.query, function(err, result) {
            assert.equal(null, err);
            console.log('doc inserted');
        });
        var newvalues = {$set: {motivator: 1}}
        await db.collection('studyTimes').updateOne({"_id": ObjectId(req.query.studyTimeID)}, newvalues, function(err, result) {
            assert.equal(null, err);
            console.log('motivator set to 1');
        });

        //send email about confirmed meeting
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'hankhowland',
              pass: 'jojo3302'
            }
          });
          
          var mailOptions = {
            from: 'hankhowland@gmail.com',
            to: 'hankhowland@gmail.com',
            subject: 'Pollinate Meeting Confirmed!!',
            text: `A motivator was found for your study session`
          };
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        res.redirect('/routes/motivate?user=' + req.query.motivatorEmail);   
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



///////////////////utility Functions//////////////////////
function zeroFormat(hour) {
    hour = hour.toString();
    if (hour.length == 1) {
        return "0" + hour.toString();
    }
    else {
        return hour.toString();
    }
}

function makeWeekArray() {
    var week_array = [];
    week_array.push(today);
    for(var i=1; i<7; i++) {
        const new_day = new Date();
        new_day.setDate(today.getDate() + i)
        week_array.push(new_day)
    }
    return week_array;
}

//m/d/yyyy string -> yyyymmdd int
function dateStringToInt(date) {
    var dateArr = date.split('/');
    var month = zeroFormat(dateArr[0]);
    var day = zeroFormat(dateArr[1]);
    var year = dateArr[2];
    return parseInt(`${year}${month}${day}`);
}