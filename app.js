const express = require("express");
const path = require("path");
const app = express();
const animeRoutes = require("./routes/anime");

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/", animeRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
