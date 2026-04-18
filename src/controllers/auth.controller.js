import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email & password required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ msg: "Email not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Password mismatch" });
    }

    const token = generateToken({ id: admin._id, role: "admin" });
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      partitioned: isProduction,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: admin._id,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Login failed" });
  }
};


export const getMe = async (req, res)=>{
  try{
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    res.json({
      success:true,
      user:{
        id:admin._id,
        email:admin.email,
        role:"admin"
      }
    });

  }catch(err){
    res.status(500).json({msg:"Failed to fetch user"});
  }
}

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Old password incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    admin.password = hashed;

    await admin.save();

    res.json({ success: true, msg: "Password updated" });
  } catch {
    res.status(500).json({ msg: "Error updating password" });
  }
};