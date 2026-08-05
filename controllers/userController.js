const express = require("express");
const router = express.Router();
const bycrypt = require("bcryptjs");

const mockUser = {
    username: "qasim",
    password: bycrypt.hashSync("password", 10)
};

const loginForm = (req, res) => res.render("login");
const logoutUser = (req, res) => {
    req.session.destroy();
    res.redirect("/");
};
const loginUser = (req, res) => {
    const { username, password } = req.body;
    if (username === "qasim" && bycrypt.compareSync(password, mockUser.password)) {
        req.session.user = { username };
        res.redirect("/");
    }
    else {
        res.status(401).render("login", { error: "Invalid username or password" });
    }
};
 
module.exports = { loginForm, loginUser, logoutUser };