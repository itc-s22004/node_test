import express from "express";
import {PrismaClient} from "@prisma/client";
import {check, validationResult} from "express-validator";
import rental from "./rental.js";

const router = express.Router();
const prisma = new PrismaClient();

const maxItemCount = 10;

const loginCheck = (req, res, next) => {
    if (!req.user) {
        return res.status(401).send('Unauthorized');
    }
    next();
};


router.use((req, res, next) => {
    if (!req.user) {
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    next();
});

router.get('/list/:page?', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 10; // 1ページあたりのアイテム数
        const skip = (page - 1) * limit;

        const books = await prisma.books.findMany({
            skip: skip,
            take: limit,
            select: {
                id: true,
                title: true,
                author: true,
            }
        });

        const booksWithRentalStatus = await Promise.all(books.map(async (book) => {
            const rental = await prisma.rental.findFirst({
                where: {
                    bookId: book.id,
                    returnDate: null,
                },
            });
            return {
                ...book,
                isRental: rental !== null, // 貸出中なら true
            };
        }));

        res.json({
            books: booksWithRentalStatus,
        });
    } catch (error) {
        next(error);
    }
});

// router.get("/list/:page?", async (req, res, next) => {
//     const page = req.query.page ? +req.query.page : 1;
//     const skip = maxItemCount * (page - 1);
//
//     const [book, count] = await Promise.all([
//         prisma.rental.findFirst({
//             where: {
//                 bookId: ,
//                 returnDate: null, // returnDate が null であることを検索条件として設定
//             },
//         }),
//         prisma.books.findMany({
//             skip,
//             take: 10,
//             orderBy: {
//                 id: "asc"
//             },
//             select: {
//                 id: true,
//                 title: true,
//                 author: true,
//             },
//
//         }),
//         prisma.books.count()
//
//     ])
//
//     const books = book.map(book => ({
//         id: book.id,
//         title: book.title,
//         author: book.author,
//         isRental: rental !== null
//     }))
//     const maxPageCount = Math.ceil(count / maxItemCount)
//     res.json({
//         books,
//         maxPage: maxPageCount
//     })
// })

// isRental: book.rentals > 0 ? "true" : "false", // rentals配列が空でなければ"true"



router.get('/detail/:id', loginCheck, async (req, res) => {
    const bookId = parseInt(req.params.id, 10);

    try {
        const book = await prisma.books.findUnique({
            where: {id: bookId},
            select: {
                id: true,
                isbn13: true,
                title: true,
                author: true,
                publishDate: true,
                rentals: {
                    where: {
                        returnDate: null // 現在貸し出されている（返却日がnull）レンタル情報を取得
                    },
                    select: {
                        User: {
                            select: {
                                name: true // ユーザ名を取得
                            }
                        },
                        rentalDate: true,
                        returnDeadline: true
                    },
                    take: 1
                }
            }
        });

        if (book && book.rentals.length > 0) {
            const rentalInfo = book.rentals[0]; // 最新の貸出情報を取得
            const rentalDate = new Date(rentalInfo.rentalDate);
            const returnDeadline = new Date(rentalDate);
            returnDeadline.setDate(rentalDate.getDate() + 7);

            rentalInfo.returnDeadline = returnDeadline;
        }

        if (book) {
            const response = {
                id: book.id,
                isbn13: book.isbn13,
                title: book.title,
                author: book.author,
                publishDate: book.publishDate,
                rentalInfo: book.rentals[0] ? {
                    userName: book.rentals[0].User.name,
                    rentalDate: book.rentals[0].rentalDate,
                    returnDeadline: book.rentals[0].returnDeadline
                } : undefined
            };
            res.json(response);
        } else {
            res.status(404).send('Book not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});



export default router;

