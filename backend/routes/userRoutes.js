import express from "express";
import { saveUser } from "../controllers/userController.js";
import User from "../models/user.js";


const router = express.Router();

router.post("/", saveUser);

router.get("/", async (req, res) => {
    const users= await User.find();
    res.json(users);
});

export default router;
