const router = require("express").Router();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");


//sign-up
router.post("/sign-up",async(req,res)=>{
    try{
        const {username,email,password} = req.body;
        if(!username || !email || !password){
            return res.status(400).json({message:"All fields are required"});
        }
        if(username.length<3){
            return res.status(400).json({message:"Username must contain 3 letters"});
        }
        if(username.length<8){
            return res.status(400).json({message:"Password must contain 8 character"});
        }
        
        //Check user exists or not
        const existingEmail = await User.findOne({email: email});
        const existingUserName = await User.findOne({username: username});
        if(existingEmail || existingUserName){
            return res.status(400).json({
                message: "Username or Email already exists."
            })
        }
        // hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password,salt);

        const newUser = new User({username,email,hashedPass});
        await newUser.save();
        return res.status(200).json({message:"Account created"});
    }
    catch(error){
        res.status(500).json({error});
    }
})

//sign-in
router.post("/sign-in", async(req,res)=>{
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({message:"All fields are required"});
        }
        //check user Exists
        const existingUser = await User.findOne({email:email});
        if(!existingUser){
            return res.status(400).json({message:"Invalid credentials"});
        }

        //check password is match or not
        const isMatch = await bcrypt.compare(password,existingUser.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"});
        }

        //Generate JWT token
        const token = jwt.sign({id: existingUser._id, email:existingUser.email},
            process.env.JWT_SECRET,
            {expiresIn:"30d"},
        );
        
        res.cookie("podcasterUserToken",token,{
            httpOnly:true,
            maxAge: 30*24*60*60*1000, //30 Days
            secure: process.env.NODE_ENV === "production",
            sameSite:"None"
        });

        return res.status(200).json({
            id:existingUser._id,
            username: existingUser.username,
            email:email,
            message:"Sign-in Successfully",
        })

    }catch(error){
        res.status(500).json({error});
    }
})

//Logout
router.post("/logout",async(req,res)=>{
    res.clearCookie("podcasterUserToken",{
        httpOnly:true,
    });
    res.status(200).json({message: "Logged out"});
})

//check cookie present or not
router.get("/check-cookie",async(req,res)=>{
    const token = req.cookies.podcasterUserToken;
    if(token){
        res.status(200).json({message: true});
    }
    else{
        res.status(200).json({message:false});
    }
})

//Route to fetch user details

router.get("/user-details", authMiddleware,async(req,res)=>{
    try{
        const {email} = req.user;
        const existingUser = await User.findOne({email:email}).select("-password");
        return res.status(200).json({
            user:existingUser,
        })
    }
    catch(error){
        console.log(error);
        res.status(500).json({error:error});
    }
})



module.exports = router;