import express from "express";
import {check, validationResult} from "express-validator";
import passport from "passport";
import {calcHash, generateSalt} from "../util/auth.js";
import {PrismaClient} from "@prisma/client";
import {Strategy as LocalStrategy} from 'passport-local';
import bcrypt from "bcrypt";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", (req, res, next) => {
    if (!req.user) {
        const err = new Error("unauthenticated");
        res.status(400).json({
            message: "---username and/or password is empty---"
        });
        throw err;
    }
    res.json({
        message: "logged in"
    });
});

router.post("/login", passport.authenticate("local", {
    failWithError: true // passport によるログインに失敗したらエラーを発生させる
}), (req, res, next) => {
    const isAdmin = req.user.isAdmin;
    if (!req.user.id) {
        const err = new Error("ログインできてない")
        err.status = 401
        throw err;
    }
    res.status(200).json({
        message: "OK",
        isAdmin: isAdmin
    });
})
// router.post("/login", passport.authenticate("local", {
//     failWithError: true
// }), (req, res, next) => {
//     const isAdmin = req.user.isAdmin;
//     res.status(200).json({
//         message: "OK",
//         isAdmin: isAdmin
//     });
// }, (err, req, res, next) => {
//     if (err) {
//         res.status(401).json({
//             message: "NG",
//         });
//     }
// });


router.post("/register", [
    check("name").notEmpty({ignore_whitespace: true}),
    check("email").notEmpty({ignore_whitespace: true}),
    check("password").notEmpty({ignore_whitespace: true})
], async (req, res, next) => {
    if (!validationResult(req).isEmpty()) {
        res.status(400).json({
            message: "---username and/or password is empty---"
        });
        return;
    }
    const {name, email, password} = req.body;
    const salt = generateSalt();
    const hashed = calcHash(password, salt);
    try {
        await prisma.users.create({
            data: {
                name,
                email,
                password: hashed,
                salt
            }
        });
        res.status(201).json({
            message: "created!!!!"
        });
    } catch (e) {
        switch (e.code) {
            case "P2002":
                res.status(409).json({
                    message: "NG"
                });
                break;
            default:
                console.error(e);
                res.status(500).json({
                    message: "unknown error"
                });
        }
    }
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        // res.redirect("/users/login");
        res.json({message: "Logout"})
    });
});

router.get("/check", async (req, res, next) => {
    if (!req.user) {
        const err = new Error("unauthenticated");
        res.status(401).json({
            message: "NG"
        });
        throw err;
    }
    const isAdmin = req.user.isAdmin;
    res.status(200).json({
        message: "OK",
        isAdmin: isAdmin
    });

})

export default router;