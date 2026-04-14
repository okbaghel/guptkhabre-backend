import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
   

    // validation
    if (!email || !password) {
      return res.status(400).json({ msg: "Email & password required" });
    }
   

    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(400).json({ msg: "Email not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Password mitchmatch" });
    }

    const token = generateToken({ id: admin._id, role: "admin" });

    // secure cookie (production ready)
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // true in production (HTTPS)
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        email: admin.email,
        role:"admin"

      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Login failed" });
  }
};


export const getMe = async (req, res)=>{
  try{
    const admin = await Admin.findById(req.user.id).select("-password");

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