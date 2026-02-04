import User from "../models/user.js";

export const saveUser = async (req, res) => {
  try {
    const { firebaseUID, email, username } = req.body;

    let user = await User.findOne({ firebaseUID });

    if (user) {
      return res.json({ message: "User already exists ✅", user });
    }

    user = await User.create({ firebaseUID, email, username });

    res.status(201).json({ message: "User saved ✅", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
