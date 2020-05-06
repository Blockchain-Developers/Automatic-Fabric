var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', async function(req, res, next) {
  res.render('index', {user:req.session.user, isadmin:req.session.admin});
});
module.exports = router;
