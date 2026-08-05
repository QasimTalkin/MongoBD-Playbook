const express = require("express");
const router = express.Router();
const { loginForm, loginUser, logoutUser } = require("../controllers/userController");
//const {index, addForm, create, details, remove} = require("../controllers/animeController");

router.get("/login", loginForm);
router.get("/logout", logoutUser);

router.post("/login", loginUser);

module.exports = router;
