import { Router } from "express";
import auth from "../middlewares/auth";
import * as userController from "../controllers/userControllers";

const userRouter = Router();

userRouter.get("/me", userController.getUser);
userRouter.post("/register", userController.registerUser);
userRouter.post("/login", userController.signInWithEmailAndPassword); // need auth
// userRouter.delete("/deleteuser", userController.deleteUser); // need auth
userRouter.post("/passwordreset", userController.passwordReset)
// userRouter.put("/update", auth, userController.updateUser); // need auth



export default userRouter;