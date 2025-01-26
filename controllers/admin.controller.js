const Admin = require('../models/admin.model');
const { setUser } = require('../helpers/jwt.helper');
const sendMail = require('../helpers/mail.helper');
const crypto = require('crypto');
const asyncHandler = require("express-async-handler");


const signup = asyncHandler(async (req, res) => {

    const { name, email, phone_number, password } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP
    try {
        // Check if the user with the given email already exists and is verified
        const existingAdmin = await Admin.findOne({ email, verified: true });
        if (existingAdmin) {
            return res.status(400).json({ status: false, message: 'Admin already exists with this email.' });
        }

        // Check if the user with the given phone number already exists and is verified
        const existingAdmin2 = await Admin.findOne({ phone_number, verified: true });
        if (existingAdmin2) {
            return res.status(400).json({ status: false, message: 'Admin already exists with this phone number.' });
        }

        let user;
        const newAdmin = await Admin.findOne({ email, verified: false });

        if (!newAdmin) {
            user = await Admin.create({ name, email, phone_number, password, otp });
        } else {
            // Update existing useer
            newAdmin.phone_number = phone_number;
            newAdmin.address = address;
            newAdmin.otp = otp; // Set OTP
            newAdmin.password = password;
            await newAdmin.save();
            user = newAdmin;
        }

        const mailStatus = await sendMail('Placement Preparation: Your OTP Code', email, `Your OTP code is ${otp}`);
        if (mailStatus) {
            // Respond with success and the created user
            res.status(201).json({ status: true, message: 'Verification is Needed!', user });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await Admin.findOne({ email, verified: true });
        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid email or password.' });
        }

        const isMatch = await user.isPasswordCorrect(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, message: 'Invalid email or password.' });
        }
        const token = setAdmin(user);
        const rec_email = user.email;
        const mailStatus = await sendMail('Placement Preparation: You Logged In as Admin on new Device', rec_email,
            `Placement Preparation Just wanted to let you know that your account has been loggedIn in a new device`);
        if (!mailStatus) {
            console.error("Failed to send welcome email.");
        }
        return res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const updateAdmin = asyncHandler(async (req, res) => {

    const { name, email, phone_number, address } = req.body;

    try {
        const userId = req.user.id; // Assuming user ID is extracted from a middleware

        const user = await Admin.findByIdAndUpdate(
            userId,
            { name, email, phone_number, address },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ status: false, message: 'Admin not found.' });
        }

        res.status(200).json({ status: true, message: 'Admin details updated successfully!', user });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const verifyOtp = asyncHandler(async (req, res) => {


    const { otp } = req.body;
    const { userid } = req.params;

    try {
        const user = await Admin.findOne({ _id: userid, otp, verified: false });
        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid OTP or user already verified.' });
        }

        await Admin.findByIdAndUpdate(user._id, { verified: true, otp: null });
        const mailStatus = await sendMail('Placement Preparation: Account Verified Successfully ✅', user.email, `Hello ${user.name}, Congratulations 🎉 your account is now verified and now you can start buying products.`);

        if (!mailStatus) {
            res.status(500).json({ status: false, message: 'Internal Server Error' });
        }

        const token = setAdmin(user);
        res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const resendOtp = asyncHandler(async (req, res) => {
    const { userid } = req.params;

    try {
        const user = await Admin.findOne({ _id: userid, verified: false });
        if (!user) {
            return res.status(400).json({ status: false, message: 'Admin not found or already verified.' });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        await Admin.findByIdAndUpdate(user._id, { otp: newOtp });
        const mailStatus = await sendMail('Placement Preparation: Your new OTP Code', user.email, `Your new OTP code is ${newOtp}`);

        if (mailStatus) {
            res.status(200).json({ status: true, message: 'New OTP sent successfully!' });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const getAdmin = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await Admin.findById(userId).select("-password -otp -__v -verified");
        if (!user) return res.status(500).json({ status: false, message: 'Admin Not Found' });
        return res.status(200).json({ status: true, message: "Admin Fetched", user });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Admin.findOne({ email, verified: true });
        if (!user) return res.status(404).json({ status: false, message: 'No Account Exists' });

        const otp = crypto.randomInt(100000, 999999).toString(); // Generate OTP
        user.otp = otp; // Save OTP in the user document
        await user.save();

        const mailStatus = await sendMail('Placement Preparation: Your OTP Code to Reset Password', user.email, `Your OTP code to Reset Password is ${otp}`);

        if (mailStatus) {
            res.status(200).json({ status: true, message: 'OTP Sent to your Email!' });
        } else {
            res.status(500).json({ status: false, message: 'Failed to send OTP.' });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: 'Failed to send OTP.' });
    }
});

const changePassword = asyncHandler(async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        const user = await Admin.findOne({ email, otp, verified: true });
        if (!user) return res.status(404).json({ status: false, message: 'OTP Not Correct' });
        user.password = password;
        user.otp = null;
        await user.save();
        const mailStatus = await sendMail('Placement Preparation: Password Changed Successfully ✅', user.email, `Placement Preparation: Password Changed Successfully ✅`);
        return res.status(200).json({ status: true, message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Failed to send OTP.' });
    }
});

const google_login = asyncHandler(async (req, res) => {
    const { email, google_id, name } = req.body;
    try {
        // Check if the user exists
        let user = await Admin.findOne({ email });

        if (!user) {
            // Generate random details for signup
            const randomPassword = Math.random().toString(36).slice(-8); // Random strong password of length 8
            const randomPhoneNumber = `9${Math.floor(100000000 + Math.random() * 900000000)}`; // Random unique 10-digit phone number
            const dummyAddress = "Dummy Address, Not Provided";
            // Create a new user with the provided Google ID and other dummy details
            user = await Admin.create({
                name,
                email,
                google_id,
                phone_number: randomPhoneNumber,
                address: dummyAddress,
                password: randomPassword,
                verified: true, // Mark user as verified since logged in with Google
            });
            // Optionally, send a welcome email with login details (optional step)
            const welcomeMailStatus = await sendMail(
                "Placement Preparation: You Logged In as Admin on new Device!",
                email,
                `Dear ${name},\n\nYour account has been successfully created via Google Login.\n\nLogin Details:\nEmail: ${email}\nTemporary Password: ${randomPassword}\n\nPlease change your password after login.`
            );
            if (!welcomeMailStatus) {
                console.error("Failed to send welcome email.");
            }
        } else {
            // If the user exists, validate Google ID
            if (user.google_id && user.google_id !== google_id) {
                return res.status(400).json({ status: false, message: 'Invalid Google ID' });
            }
            // Associate the Google ID with the user
            user.google_id = google_id;
            await user.save();
        }

        user.otp = null;
        user.verified = true;
        await user.save();
        // Generate JWT token for the user
        const token = setUser(user);
        // Notify user about login via email (optional step)
        const mailStatus = await sendMail(
            'Placement Preparation: You Logged In as Admin on new Device',
            email,
            `Dear ${name},\n\nYour account has been logged in on a new device.\n\nIf this wasn't you, please contact our support team immediately.`
        );
        if (!mailStatus) {
            console.error("Failed to send login notification email.");
        }
        // Respond with success
        return res.status(200).json({ status: true, message: 'Login successful!', token });
    } catch (error) {
        console.error("Google Login Error:", error);
        return res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});



module.exports = {
    signup,
    login,
    updateAdmin,
    verifyOtp,
    resendOtp,
    getAdmin,
    forgotPassword,
    changePassword,
    google_login
};