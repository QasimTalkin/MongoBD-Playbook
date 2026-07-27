const express = require("express");
const router = express.Router();
const {index, addForm, create, details, remove} = require("../controllers/animeController");

router.get("/", index);
router.get("/add", addForm);
router.post("/add", create);
router.get("/anime/:id", details);
router.post("/anime/:id/delete", remove);

module.exports = router;
