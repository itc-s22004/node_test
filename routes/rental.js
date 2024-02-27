import express from "express";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.use((req, res, next) => {
    if (!req.user) {
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    next();
});

router.post('/start', async (req, res) => {
    const {bookId} = req.body;
    const userId = req.user.id;

    try {
        const existingRental = await prisma.rental.findFirst({
            where: {
                bookId: BigInt(bookId),
                returnDate: null
            },
        });

        if (existingRental) {
            return res.status(409).send({message: '貸出中　失敗'});
        }

        // 貸出処理
        const today = new Date();
        const returnDeadline = new Date(today);
        returnDeadline.setDate(today.getDate() + 7);

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
        res.status(400).json({message: error})
    }
});

router.put('/return', async (req, res, next) => {
    const {rentalId} = req.body;
    const userId = req.user.id

    try {
        const rental = await prisma.rental.findUnique({
            where: {
                id: BigInt(rentalId),
                userId: userId
            },
        });

        if (!rental) {
            return res.status(400).json({result: 'NG', message: 'その他のエラー'});
        }

        if (rental.returnDate) {
            return res.status(400).json({result: 'NG', message: 'Book is already returned.'});
        }

        const updatedRental = await prisma.rental.update({
            where: {
                id: BigInt(rentalId),
                userId: userId
            },
            data: {
                returnDate: new Date(),
            },
        });

        res.status(200).json({
            result: 'OK',
            // userId: userId
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({result: 'NG', message: '---An error occurred.---'});
    }
});

router.get("/current", async (req, res, next) => {
    const userId = await req.user.id
    try {
        const [rentalAllBooks] = await Promise.all([
            prisma.rental.findMany({
                where: {
                    returnDate: null,
                    userId: userId
                },
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
        const rentalBooks = rentalAllBooks.map(book => ({
            rentalId: book.id,
            bookId: book.bookId,
            bookName: book.Books.title,
            rentalDate: book.rentalDate,
            returnDeadline: book.returnDeadline
        }));
        res.status(200).json({
            rentalBooks
        })
    } catch (e) {
        console.error(e);
        res.status(500).send({ message: "---An eroor occurred.---" })
    }
})

router.get("/history", async (req, res, next) => {
    const userId = await req.user.id
    try {
        const [rentalBooks] = await Promise.all([
            prisma.rental.findMany({
                where: {
                    userId: userId
                },
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