import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const auth: RequestHandler = (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new Error("Not authorized");
    }
    const token = authorization.replace("Bearer ", "");
    const user = jwt.verify(token, process.env.JWT_SECRET);
    // @ts-ignore
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export default auth;