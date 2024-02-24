import express from "express";
import {PrismaClient} from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();


router.post('/start', async (req, res) => {
    const { bookId } = req.body;
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
            return res.status(409).send({ message: 'Book is already rented.' });
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
        res.status(400).send({ message: 'An error occurred' });
    }
});

export default router;
