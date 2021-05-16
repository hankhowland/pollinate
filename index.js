const routes = require('./routes.js');
const express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const mongo = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000

app.use(express.static(__dirname + '/public'));

//for post forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//for ejs files
app.set('view engine', 'ejs');

//for sessions stuff
app.use(cookieParser());
app.use(session({secret: "Jack Ogle is a peen"}));

//db connection url
const url = 'mongodb+srv://hankhowland:jojo3302@lists.9qsfv.mongodb.net/<dbname>?retryWrites=true&w=majority'

//general db connection
mongo.connect(url, { promiseLibrary: Promise }, (err, client) => {
    if (err) {
      logger.warn(`Failed to connect to the database. ${err.stack}`);
    }
    //each routes function will use this one connection
    app.locals.db = client.db('pollinate');
    app.listen(PORT, () => {console.log(`server running on port ${PORT}`)});
  });

//contains all the actual routes, which should be /route + their actual path
app.use('/routes', routes);