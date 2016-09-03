var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require("express-session");
var flash = require("connect-flash")
var ig = require('instagram-node').instagram();

ig.use({ client_id: '0452541af1f2410fa0eacf4e74e928cf',
         client_secret: 'b5a8553bccdb46778e26a5563b566385' });

var redirect_uri = 'http://localhost:3000/handleauth';

// var routes = require('./routes/index');
// var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:'secret',
  saveUninitialized: true,
  resave: true
}));

//connect-flash
app.use(flash());

//Global Vars
app.use(function(req, res, next){
  res.locals.messages = require("express-messages")(req, res);
  res.locals.moment = require("moment");

res.locals.formatDate = function(date){
  var myDate = new Date(date * 1000);
  return myDate.toLocaleString();
}

  if(req.session.accesstoken && req.session.accesstoken != "undefined"){
    res.locals.isLoggedIn = true;
  }else{
    res.locals.isLoggedIn= false;
  }
    
  next();
});

// app.use('/', routes);
// app.use('/users', users);

app.get("/", function(req, res){
  res.render('index',{
    title: 'Welcome'
  })
})

app.get("/login", function(req, res){
  res.redirect(ig.get_authorization_url(redirect_uri, { scope: ['likes'], state: 'a state' }));
});

app.get("/handleauth", function(req, res){
  console.log("Code is " + req.query.code);
  ig.authorize_user(req.query.code, redirect_uri, function(err, result) {
      if (err) {
        console.log(err.body);
        res.send(err);
      } else {
        req.session.accesstoken = result.access_token
        req.session.uid = result.user.id;
        ig.use({access_token : req.session.accesstoken})

        console.log('Yay! Access token is ' + result.access_token);
        res.redirect('/main');
      }
    });
});

app.get("/main", function(req, res){
  ig.user(req.session.uid, function(err, result,remaining, limit){
    if(err){
      res.send(err)
    }
    else
    {
      ig.user_self_media_recent({}, function(err, medias){
        res.render("main",{
          title:'Main Instgram Feed',
          user: result,
          medias: medias
        });
      });
    }

  })
})

app.get("/me", function(req, res){
  ig.user(req.session.uid, function(err, result, remaining, limit){
    if(err){
      res.send(err)
    }
    else
    {
      ig.user_self_media_recent({}, function(err, medias){
        res.render("main",{
          title:'My Recent Images',
          user: result,
          medias: medias
        });
      });
    }    
  });
});

app.get("/logout", function(req, res){
  req.session.accesstoken = false;
  req.session.uid =false;
  res.redirect("/")
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
