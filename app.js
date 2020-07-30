let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let session = require('express-session');
let MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

let sessionStore = new MySQLStore({}, con);

let app = express();

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

let indexRouter = require('./routes/index');
let newRouter = require('./routes/new');
let fillRouter = require('./routes/fill');
let editRouter = require('./routes/edit');
let confirmRouter = require('./routes/confirm');
//var finalizeRouter = require('./routes/finalize');
let settingsRouter = require('./routes/settings');
let adminRouter = require('./routes/admin');
let connectionRouter = require('./routes/connection');
let networkRouter = require('./routes/network');
let channelRouter = require('./routes/channel');
let chaincodeRouter = require('./routes/chaincode');
let loginRouter = require('./routes/login');

<<<<<<< HEAD
=======
app.all("*", function (req, resp, next) {
   if(!req.originalUrl=='/login'&&!req.session.user) {
     res.redirect('/login');
   }
   else {
     next();
   }
});

>>>>>>> parent of 783f802... bug fix
app.use('/', indexRouter);
app.use('/new', newRouter);
app.use('/fill', fillRouter);
app.use('/edit', editRouter);
app.use('/confirm', confirmRouter);
//app.use('/finalize', finalizeRouter);
app.use('/settings', settingsRouter);
app.use('/admin', adminRouter);
app.use('/connection', connectionRouter);
app.use('/network', networkRouter);
app.use('/channel', channelRouter);
app.use('/chaincode', chaincodeRouter);
app.use('/login', loginRouter);
app.post('/writekey', function(req, res, next){
  con.query('update users set pubkey=?, keyexists=1 where keyexists=0 && username=?', [req.body.pubkey, req.session.user]);
  res.redirect('/');
});
// app.get('/a/:user', function(req, res, next){
//   req.session.user=req.params.user;
//   req.session.authorized='authorized';
//   res.end();
// })
app.get('/logout', function(req, res, next){
  delete req.session.user;
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
