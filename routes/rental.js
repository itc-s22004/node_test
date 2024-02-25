import express from "express";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

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



router.post('/start', async (req, res) => {
    const {bookId} = req.body;
    const userId = req.user.id; // 認証済みユーザーのIDを仮定

    try {
        // 既に貸出中の書籍か確認
        const existingRental = await prisma.rental.findFirst({
            where: {
                bookId: BigInt(bookId),
                returnDate: null
            },
        });

        if (existingRental) {
            return res.status(409).send({message: 'Book is already rented.'});
        }

        // 貸出処理
        const today = new Date();
        const returnDeadline = new Date(today);
        returnDeadline.setDate(today.getDate() + 7); // 2週間後を返却期限とする

        const newRental = await prisma.rental.create({
            data: {
                bookId: BigInt(bookId),
                userId: BigInt(userId),
                rentalDate: today,
                returnDeadline: returnDeadline,
            },
        });

        res.status(201).json({
            id: newRental.id,
            bookId: newRental.bookId,
            rentalDate: newRental.rentalDate,
            returnDeadline: newRental.returnDeadline,
        });
    } catch (error) {
        console.error(error);
        res.status(400).send({message: 'An error occurred'});
    }
});

router.put('/return', async (req, res, next) => {
    const {rentalId} = req.body;

    try {
        const rental = await prisma.rental.findUnique({
            where: {
                id: BigInt(rentalId),
            },
        });

        if (!rental) {
            return res.status(400).json({result: 'NG', message: 'Rental record not found.'});
        }

        if (rental.returnDate) {
            return res.status(400).json({result: 'NG', message: 'Book is already returned.'});
        }

        const updatedRental = await prisma.rental.update({
            where: {
                id: BigInt(rentalId),
            },
            data: {
                returnDate: new Date(), // 現在の日時を返却日とする
            },
        });

        res.status(200).json({result: 'OK'});
    } catch (error) {
        console.error(error);
        res.status(400).json({result: 'NG', message: '---An error occurred.---'});
    }
});

router.get("/current", async (req, res, next) => {
    try {
        const [rentalBooks] = await Promise.all([
            prisma.rental.findMany({
                orderBy: {
                    id: "asc"
                },
                select: {
                    id: true,
                    bookId: true,
                    Books: {
                        select: {
                            title: true
                        }
                    },
                    rentalDate: true,
                    returnDeadline: true,
                }
            })
        ])
        res.status(200).json({
            rentalBooks
        })
    } catch (e) {
        console.error(e);
        res.status(500).send({ message: "---An eroor occurred.---" })
    }
})

router.get("/history", async (req, res, next) => {
    try {
        const [rentalBooks] = await Promise.all([
            prisma.rental.findMany({
                orderBy: {
                    id: "asc"
                },
                select: {
                    id: true,
                    bookId: true,
                    Books: {
                        select: {
                            title: true
                        }
                    },
                    rentalDate: true,
                    returnDate: true
                }
            })
        ])
        res.status(200).json({
            rentalBooks
        })
    } catch (e) {
        console.error(e);
        res.status(500).send({ message: "---An eroor occurred.---" })
    }
})

export default router;