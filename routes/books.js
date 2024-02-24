import express from "express";
import {PrismaClient} from "@prisma/client";
import {check, validationResult} from "express-validator";

const router = express.Router();
const prisma = new PrismaClient();

const maxItemCount = 10;

// 要ログインのミドルウェア（仮実装）
const loginCheck = (req, res, next) => {
    if (!req.user) {
        return res.status(401).send('Unauthorized');
    }
    next();
};


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

router.get("/list/:page?", async (req, res, next) => {
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

        }),
        prisma.books.count()

    ])
    const maxPageCount = Math.ceil(count / maxItemCount)
    res.json({
        book,
        maxPage: maxPageCount
    })
})



// 書籍詳細のエンドポイント
router.get('/detail/:id',  async (req, res, next) => {
    const { id } = req.params;
    try {
        const book = await prisma.books.findUnique({
            where: { id: BigInt(id) },
            include: {
                rentals: {
                    select: {
                        User: {
                            select: {
                                name: true,
                            }
                        },
                        rentalDate: true,
                        returnDeadline: true,
                    }
                }
            }
        });

        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }

        const response = {
            id: book.id,
            isbn13: book.isbn13,
            title: book.title,
            author: book.author,
            publishDate: book.publishDate,
            rentalInfo: book.rentals.length > 0 ? {
                userName: book.rentals[0].User.name,
                rentalDate: book.rentals[0].rentalDate,
                returnDeadline: book.rentals[0].returnDeadline,
            } : undefined,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'An error occurred' });
    }
});

// router.get('/detail/:id', loginCheck, async (req, res) => {
//     const bookId = parseInt(req.params.id, 10);
//
//     try {
//         const book = await prisma.books.findUnique({
//             where: {id: bookId},
//             select: {
//                 id: true,
//                 isbn13: true,
//                 title: true,
//                 author: true,
//                 publishDate: true,
//                 rentals: {
//                     where: {
//                         returnDate: req.returnDeadline // 現在貸し出されている（返却日がnull）レンタル情報を取得
//                     },
//                     select: {
//                         User: {
//                             select: {
//                                 name: true // ユーザ名を取得
//                             }
//                         },
//                         rentalDate: true,
//                         returnDeadline: true
//                     },
//                     take: 1 // 最新の貸出情報のみを取得
//                 }
//             }
//         });
//
//         // 貸し出し情報が存在する場合、貸し出し日から7日後を返却期限日として計算
//         if (book && book.rentals.length > 0) {
//             const rentalInfo = book.rentals[0]; // 最新の貸出情報を取得
//             const rentalDate = new Date(rentalInfo.rentalDate);
//             const returnDeadline = new Date(rentalDate);
//             returnDeadline.setDate(rentalDate.getDate() + 7); // 貸し出し日から7日後
//
//             rentalInfo.returnDeadline = returnDeadline; // 計算した返却期限日を設定
//         }
//
//         if (book) {
//             const response = {
//                 id: book.id,
//                 isbn13: book.isbn13,
//                 title: book.title,
//                 author: book.author,
//                 publishDate: book.publishDate,
//                 rentalInfo: book.rentals[0] ? {
//                     userName: book.rentals[0].User.name,
//                     rentalDate: book.rentals[0].rentalDate,
//                     returnDeadline: book.rentals[0].returnDeadline
//                 } : undefined
//             };
//             res.json(response);
//         } else {
//             res.status(404).send('Book not found');
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal server error');
//     }
// });
//


export default router;

