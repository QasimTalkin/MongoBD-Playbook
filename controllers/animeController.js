const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "..", "data", "anime.json");
let animeList = JSON.parse(fs.readFileSync(dataPath, "utf8"));
let nextId = Math.max(0, ...animeList.map(a => a.id)) + 1;

exports.index = (req, res) => {
    res.render("index", {
        title: "My Anime Collection",
        anime: animeList
    });
};

exports.details = (req, res) => {
    const anime = animeList.find(a => a.id === Number(req.params.id));
    if (!anime) {
        return res.status(404).render("index", {
            title: "Not found",
            anime: animeList
        });
    }
    res.render("details", { title: anime.title, anime });
};

exports.addForm = (req, res) => {
    res.render("add", { title: "Add anime" });
};

exports.create = (req, res) => {
    const anime = {
        id: nextId++,
        title: req.body.title,
        rating: Number(req.body.rating)
    };
    animeList.push(anime);

    res.redirect("/");
};

exports.remove = (req, res) => {
    animeList = animeList.filter(a => a.id !== Number(req.params.id));
    res.redirect("/");
};
