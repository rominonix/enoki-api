import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import userRouter from "./routes/index";
import fileUpload from 'express-fileupload';




// import mailRouter from './routes/mailRoutes'
// import auth from "../src/middlewares/auth";

const app = express();
app.use(express.json());
app.use(fileUpload())
app.use("/api/", userRouter);
// app.use('/api/mail', auth, mailRouter)
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Application running on port ${PORT}.`);
});
