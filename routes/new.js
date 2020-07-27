let express = require("express");
let router = express.Router();
let randomstring = require("randomstring");
const { promisify } = require("util");

const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});

const queryAsync = promisify(con.query).bind(con);

/* GET home page. */

router.get("/", async function (req, res) {
    res.render("new", { user: req.session.user });
});
router.post("/", async function (req, res) {
    let str = "";
    for (let i = 0; i < req.body.fields.length; i++) {
        if (i != 0) {
            str += ", ";
        }
        str += "'";
        str += req.body.fields[i];
        str += "'";
    }
    let err,
        results = await queryAsync(
            "select username from users where role=? and username in (" +
                str +
                ")",
            ["user"]
        );
        if(err) {
          console.log(err);
        }
    if (results.length == req.body.fields.length) {
        let data = {};
        data.orgcount = req.body.fields.length;
        data.org = [];
        let id = await randomstring.generate({
            length: 10,
            charset: "numeric",
        });

        for (let i = 0; i < data.orgcount; i++) {
            data.org.push({});
            data.org[i].name = req.body.fields[i];
            let err,
                results = await queryAsync(
                    "select username, data from users where username=?",
                    req.body.fields[i]
                );
                if(err) {
                  console.log(err);
                }
            let userdata = JSON.parse(results[0].data);
            if (!userdata) {
                userdata = {};
            }
            if (!userdata.pending) {
                userdata.pending = [];
                userdata.pending.push({ id: id, filled: 0 });
            } else {
                userdata.pending.push({ id: id, filled: 0 });
            }
            const userdata_str = JSON.stringify(userdata);
            await queryAsync("update users set data=? where username=?", [
                userdata_str,
                results[0].username,
            ]);
        }
        let data_str = JSON.stringify(data);
        await queryAsync("insert into pending set id=?, data=?", [
            id,
            data_str,
        ]);
        res.redirect("/");
    } else {
        res.render("new", {
            user: req.session.user,
            message: "non-existence member detected",
        });
    }
});
module.exports = router;
