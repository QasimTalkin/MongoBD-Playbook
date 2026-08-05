const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");
const animeRoutes = require("./routes/anime");
const userRoutes = require("./routes/userRoutes");


app.use(session({
    secret: "a very secret key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // for local development
}));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/user", userRoutes);
app.use("/", animeRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
