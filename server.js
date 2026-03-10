const nodemailer = require("nodemailer");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/* serve uploaded files */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(session({
    secret: "secret123",
    resave: false,
    saveUninitialized: false
}));

/* -------------------- FOLDER SETUP -------------------- */

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync("users.json")) {
    fs.writeFileSync("users.json", "[]");
}

/* -------------------- AUTH CHECK -------------------- */

function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/");
    }
}

/* -------------------- MULTER STORAGE -------------------- */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

/* -------------------- EMAIL SETUP -------------------- */

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "bhavanatejavath2003@gmail.com",
        pass: "qcnmhnonnmfjmuwm"
    }
});

/* -------------------- ROUTES -------------------- */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public/register.html"));
});

app.get("/otp", (req, res) => {
    res.sendFile(path.join(__dirname, "public/otp.html"));
});

app.get("/upload", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public/upload.html"));
});

app.get("/gallery", checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "public/gallery.html"));
});

/* -------------------- REGISTER -------------------- */

app.post("/register", async (req, res) => {

    const { username, password } = req.body;

    let users = JSON.parse(fs.readFileSync("users.json"));

    const hash = await bcrypt.hash(password, 10);

    users.push({ username, password: hash });

    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));

    res.redirect("/");
});

/* -------------------- LOGIN -------------------- */

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    let users = JSON.parse(fs.readFileSync("users.json"));

    let user = users.find(u => u.username === username);

    if (!user) return res.send("Invalid username");

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.send("Invalid password");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    req.session.otp = otp;
    req.session.tempUser = username;

    await transporter.sendMail({
        to: "bhavanatejavath2003@gmail.com",
        subject: "OTP Login",
        text: `Your OTP is ${otp}`
    });

    res.redirect("/otp");
});

/* -------------------- OTP VERIFY -------------------- */

app.post("/verify-otp", (req, res) => {

    if (req.body.otp === req.session.otp) {

        req.session.user = req.session.tempUser;

        res.redirect("/upload");

    } else {

        res.send("Invalid OTP");

    }

});

/* -------------------- FILE UPLOAD -------------------- */

app.post("/uploadfile", checkAuth, upload.array("media", 10), (req, res) => {

    res.redirect("/gallery");

});

/* -------------------- GET FILE LIST -------------------- */

app.get("/files", (req, res) => {

    fs.readdir("./uploads", (err, files) => {

        if (err) {
            console.log(err);
            return res.json([]);
        }

        res.json(files);

    });

});

/* -------------------- DELETE FILE -------------------- */
app.delete("/delete/:name", (req, res) => {

const fileName = req.params.name;
const filePath = path.join(__dirname, "uploads", fileName);

fs.unlink(filePath, (err) => {

if (err) {
console.log(err);
return res.json({ success:false });
}

res.json({ success:true });

});

});

const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 5,
message: "Too many login attempts. Try again later."
});

app.use("/login", loginLimiter);

/* -------------------- SERVER -------------------- */

app.listen(3000, () => {

    console.log("Server running at http://localhost:3000");

});