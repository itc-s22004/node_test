// adminだったら追加できるようにする　の判定しないといけない

import express from "express";
import passport from "passport";
import {PrismaClient} from "@prisma/client";

const {handle} = "express/lib/router/index.js";
const router = express.Router();
const prisma = new PrismaClient();

// server.use(express.json()); // JSONパース用のミドルウェア

/**
 * 全経路でログイン済みかチェックする
 */
router.use((req, res, next) => {
    console.log(req.user.isAdmin)
    if (!req.user.isAdmin) {
        const err = new Error("you not admin");
        err.status = 403;
        throw err;
    }
    next();
})

// 管理者権限チェックミドルウェア
const checkAdminMiddleware = async (req, res, next) => {
    // const adminUser = prisma.users.isAdmin
    if (!req.user) {
        // 未ログインなら、Error オブジェクトを作って、ステータスを設定してスロー
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    next();
};

// POST /admin/book/create エンドポイント
router.post("/book/create", checkAdminMiddleware, async (req, res) => {
    const {isbn13, title, author, publishDate} = req.body;

    // リクエストデータのバリデーション (簡単な例)
    if (!isbn13 || !title || !author || !publishDate) {
        return res.status(400).json({result: 'NG'});
    }

    try {
        const book = await prisma.books.create({
            data: {
                isbn13,
                title,
                author,
                publishDate: new Date(publishDate),
            },
        });
        res.status(201).json({result: 'book create OK!!!'});
    } catch (error) {
        console.error(error);
        res.status(400).json({result: 'book create NG...'});
    }
});

// その他のNext.jsのルーティングを処理
router.all('*', (req, res) => {
    return handle(req, res);
});


export default router;