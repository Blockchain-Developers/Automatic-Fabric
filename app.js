var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

var sessionStore = new MySQLStore({}, con);

var app = express();

app.use(session(
{
        secret: 'asdfasdI0YOYiAxjOtR',
        resave: true,
        saveUninitialized: true,
        store: sessionStore,
        cookie:
        {
                maxAge: 1000 * 60 * 60
        },
        rolling: true,
}));

// view engine setup
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

var indexRouter = require('./routes/index');
var createRouter = require('./routes/create');
var newRouter = require('./routes/new');
var fillRouter = require('./routes/fill');
var editRouter = require('./routes/edit');
var confirmRouter = require('./routes/confirm')

app.use('/', indexRouter);
app.use('/create', createRouter);
app.use('/new', newRouter);
app.use('/fill', fillRouter);
app.use('/edit', editRouter);
app.use('/confirm', confirmRouter);
app.use('/logout', function(req, res, next){
  delete req.session.authorized;
  res.redirect('/');
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
