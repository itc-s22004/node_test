import express from "express";
import passport from "passport";
import {PrismaClient} from "@prisma/client";

const {handle} = "express/lib/router/index.js";
const router = express.Router();
const prisma = new PrismaClient();


router.use((req, res, next) => {
    console.log(req.user.isAdmin)
    if (!req.user.isAdmin) {
        const err = new Error("you not admin");
        err.status = 403;
        throw err;
    }
    next();
});

const checkAdminMiddleware = async (req, res, next) => {
    // const adminUser = prisma.users.isAdmin
    if (!req.user) {
        const err = new Error("unauthenticated");
        err.status = 401;
        throw err;
    }
    next();
};

router.post("/book/create", checkAdminMiddleware, async (req, res) => {
    const {isbn13, title, author, publishDate} = req.body;

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
        res.status(201).json({result: 'OK!!!'});
    } catch (error) {
        console.error(error);
        res.status(400).json({result: 'なんか違う'});
    }
});

router.put("/book/update", async (req, res, next) => {
    const { id, isbn13, title, author, publishDate } = req.body;
    try {
        const book = await prisma.books.findUnique({
            where: {
                id: id
            }
        })
        const updateBook = await prisma.books.update({
            where: {
                id: id
            },
            data: {
                id: id,
                isbn13: isbn13,
                title: title,
                author: author,
                publishDate: new Date(publishDate)
            }
        })
        res.status(200).json({result: "update OK"})
    } catch (e) {
        console.log(e)
        res.status(400).json({result: "NG"})
    }
})

router.get("/rental/current", async (req, res, next) => {
    try {
        const  [adminRentalBooks]  = await Promise.all([
            prisma.rental.findMany({
                orderBy: {
                    id: "asc"
                },
                where: {
                    returnDate: null,
                },
                select: {
                    id: true,
                    userId: true,
                    User: {
                        select: {
                            name: true
                        }
                    },
                    bookId: true,
                    Books: {
                        select: {
                            id: true,
                            title: true
                        }
                    },
                    rentalDate: true,
                    returnDeadline: true
                }
            })
        ])
        const rentalBooks = adminRentalBooks.map(book => ({
            rentalId: book.id,
            userId: book.userId,
            userName: book.User.name,
            bookId: book.bookId,
            bookName: book.Books.title,
            rentalDate: book.rentalDate,
            returnDeadline: book.returnDeadline
        }));

        res.status(200).json({
            rentalBooks
        })
    } catch (e) {
        console.log(e)
        res.status(500).send({ message: "---An eroor occurred.---" })
    }
})

router.get("/rental/current/:uid", async (req, res, next) => {
    const uid = parseInt(req.params.uid)
    try {

        // const uidCurrent = await prisma.rental.findMany({
        //
        // })
        const [rentalAllBooks] = await Promise.all([
            prisma.rental.findMany({
                where: {
                    userId: uid,
                    returnDate: null,
                },
                select: {
                    id: true,
                    bookId: true,
                    User: {
                        select: {
                            name: true,
                        }
                    },
                    Books: {
                        select: {
                            title: true
                        }
                    },
                    rentalDate: true,
                    returnDeadline: true
                }
            })
        ])
        const rentalBooks = rentalAllBooks.map(book => ({
            rentalId: book.id,
            bookId: book.bookId,
            bookName: book.User.name,
            rentalDate: book.rentalDate,
            returnDeadline: book.returnDeadline
        }))
        res.status(200).json({
            userId: uid,
            userName: rentalBooks.name,
            rentalBooks
        })


    } catch (e) {
        console.log(e)
        res.status(404).send("なんかミス")
    }
})

router.all('*', (req, res) => {
    return handle(req, res);
});


export default router;