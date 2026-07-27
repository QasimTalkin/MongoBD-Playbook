const express = require("express");
const router = express.Router();
const animeController = require("../controllers/animeController");

router.get("/", animeController.index);
router.get("/add", animeController.addForm);
router.post("/add", animeController.create);
router.get("/anime/:id", animeController.details);
router.post("/anime/:id/delete", animeController.remove);

module.exports = router;
