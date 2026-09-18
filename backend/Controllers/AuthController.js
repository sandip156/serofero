// backend/Controllers/AuthController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");

// SIGNUP
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if user already exists
    // const existingUser = await UserModel.findOne({ email });
    // if (existingUser) {
    //   return res
    //     .status(409)
    //     .json({ message: "User already exists", success: false });
    // }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create & save
    const user = new UserModel({ name, email, password: hashedPassword });
    await user.save();

    return res
      .status(201)
      .json({ message: "Signup successfully!", success: true });
  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const errorMsg = "Auth failed: email or password is wrong";

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(403).json({ message: errorMsg, success: false });
    }

    const isPassEqual = await bcrypt.compare(password, user.password);
    if (!isPassEqual) {
      return res.status(403).json({ message: errorMsg, success: false });
    }

    const payload = {
      email: user.email,
      _id: user._id,
      isAdmin: user.isAdmin, // 👈 include admin flag
    };

    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      message: "Login Success",
      success: true,
      jwtToken,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin, // 👈 send to frontend
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

module.exports = {
  signup,
  login,
};
