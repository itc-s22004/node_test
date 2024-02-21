import express from "express";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const maxItemCount = 10;

router.use((req, res, next) => {
    if (!req.user) {
        // 未ログイン
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    // 問題なければ次へ
    next();
});

router.get("/list", async (req, res, next) => {
    const page = req.query.page ? +req.query.page : 1;
    const skip = maxItemCount * (page - 1);

    const [book, count] = await Promise.all([
        prisma.books.findMany({
            skip,
            take: 10,
            orderBy: {
                id: "asc"
            },
            select: {
                id: true,
                title: true,
                author: true,
            },
            // where: {
            //     id: req.id,
            //     title: req.title,
            //     author: req.author,
            //     isRental: req.isRental
            // }
        }),
        prisma.books.count()
    ])
    const maxPageCount = Math.ceil(count / maxItemCount)
    res.json({
        book,
        maxPage: maxPageCount
    })
})

export default router;

