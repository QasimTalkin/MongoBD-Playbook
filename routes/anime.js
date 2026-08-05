const express = require("express");
const router = express.Router();
const {index, addForm, create, details, remove} = require("../controllers/animeController");


function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect("/user/login");
}
router.get("/", index);
router.use(isAuthenticated); // Apply authentication middleware to all routes below
router.get("/add", addForm);
router.post("/add", create);
router.get("/anime/:id", details);
router.post("/anime/:id/delete", remove);

module.exports = router;
