let express = require("express");
let router = express.Router();
let randomstring = require("randomstring");
let passwordHash = require("password-hash");
const mysql = require("mysql");
const { promisify } = require("util");
const con = mysql.createConnection({
    host: "mariadb",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});
const queryAsync = promisify(con.query).bind(con);
/* GET home page. */

router.get("/", function (req, res) {
    res.render("admin");
});
router.post("/new", async function (req, res) {
    const username = req.body.username;
    let password = await randomstring.generate(8);
    let hashedPassword = await passwordHash.generate(password);
    let err,
        results = await queryAsync(
            "select * from users where username=?",
            username
        );
    if(err) {
      console.log(err);
    }
    if (!results.length) {
        await queryAsync(
            "insert into users set username=?, passwordhash=?, role=?, status=?",
            [username, hashedPassword, "User", "Active"]
        );
        res.render("user-created", { password: password });
    } else {
        res.redirect("back");
    }
});
module.exports = router;
