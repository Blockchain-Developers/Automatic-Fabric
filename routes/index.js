var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');
/* GET home page. */
router.get('/', async function(req, res, next) {
  var user=await fetch('/user');
  res.render('index', { user:user });
});
module.exports = router;
