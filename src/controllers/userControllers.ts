import { RequestHandler } from "express";
import { db, authenticate } from "../db/index";
import { transporter } from "../mail/client";
import { passwordResetEmail } from "../mail/templates";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createId,
  checkEmailExists,
  hashPassword,
  createTemporaryPassword,
  actionCodeSettings,
} from "../utils";

import path from "path";
// import fileUpload from 'express-fileupload';

import { v4 as uuidv4 } from "uuid";

// export const getUser: RequestHandler = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const querySnapshot = await db.collection("users").doc(email).get();
//     res.json({ users: querySnapshot.data() });
//   } catch (error) {
//     res.json({ error });
//   }
// };

export const getUser: RequestHandler = async (req, res, next) => {
  try {
    const querySnapshot = await db
      .collection("users")
      //@ts-ignore
      .doc(req.user.email)
      .get();
    // if (!querySnapshot.data()) {
    //   throw new UserNotFound();
    // }
    res.json({ users: querySnapshot.data() });
  } catch (error) {
    next(error);
  }
};

// export const getUser: RequestHandler = async (req, res, next) => {
//   try {
//     const querySnapshot = await db
//       .collection("users")
//       //@ts-ignore
//       .doc(req.user.email)
//       .get();
//     // if (!querySnapshot.data()) {
//     //   throw new UserNotFound();
//     // }
//     console.log( querySnapshot);

//     res.json({ users: querySnapshot.data() });
//   } catch (error) {
//     next(error);
//   }
// };

export const registerUser: RequestHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await hashPassword(password);
    const userId = createId();
    const checkEmail = await checkEmailExists(email);

    if (checkEmail === true) {
      res.json({ message: "Email already exists" });
      // throw new InvalidRegister();
    } else {
      await authenticate
        .createUser({
          uid: userId,
          email: email,
          password: hashedPassword,
        })
        .then((userRecord) => {
          console.log("Successfully created new user:", userRecord.uid);
        })
        .catch((error) => {
          console.log("Error creating new user:", error);
        });

      await db.collection("users").doc(email).set({
        id: userId,
        name: name,
        email: email,
        password: hashedPassword,
      });

      res.json({ message: "User successfully created!" });

      await authenticate.generateEmailVerificationLink(
        email,
        actionCodeSettings
      );
      // .then((link) => {
      //   // using custom SMTP server.
      //   transporter.sendMail({
      //     from: '"24Gossip" <info@24Gossip.se>',
      //     to: email,
      //     subject: "Bekräfta din e-postadress till 24 Gossip!",
      //     html: verificationEmail(link),
      //   });
      // });
    }
  } catch (error) {
    res.json(error);
  }
};

export const signInWithEmailAndPassword: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { email, password } = req.body;
    const snapshot = await db.collection("users").doc(email).get();
    const user = snapshot.data();
    const valid = await bcrypt.compare(password, user.password);
    if (valid) {
      const payload = {
        id: user.id,
        email: user.email,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      res.json({ token, user });
    } else {
      res.json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.json({ error });
    next(error);
  }
};

export const signInWithLink: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body;

    await authenticate.generateSignInWithEmailLink(email, actionCodeSettings);
    // .then((link) => {
    //   // using custom SMTP server.
    //   transporter.sendMail({
    //     from: '"24Gossip" <info@24Gossip.se>',
    //     to: email,
    //     subject: "Bekräfta din e-postadress till 24 Gossip!",
    //     html: verificationEmail(link),
    //   });
    // });

    res.json({ message: "Email successfully sent!" });
  } catch (error) {
    res.json({ error });
    next(error);
  }
};

export const passwordReset: RequestHandler = async (req, res, next) => {
  const { email } = req.body;
  try {
    const checkEmail = await checkEmailExists(email);
    if (checkEmail === true) {
      const user = await authenticate.getUserByEmail(email);
      const password = createTemporaryPassword();
      const hashedPassword = await hashPassword(password);
      await authenticate.updateUser(user.uid, { password: hashedPassword });

      await db
        .collection("users")
        .doc(email)
        .update({ password: hashedPassword });
      res.json({ message: "Password updated" });

      await transporter.sendMail({
        from: '"Enoki" <info@enoki.se>',
        to: email,
        subject: "New temporary password till Enoki.se!",
        html: passwordResetEmail(password),
      });
    } else {
      // throw new InvalidResetPassword();
    }
  } catch (error) {
    res.json(error);
    next(error);
  }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  const { password, name } = req.body;
  //@ts-ignore
  const user = req.user as User;
  const hashedPassword = await hashPassword(password);

  if (req.body.password) {
    await db
      .collection("users")
      .doc(user.email)
      .update({ password: hashedPassword });
    res.json({ message: "Password updated" });
  }

  if (req.body.name) {
    await db.collection("users").doc(user.email).update({ name: name });
    res.json({ message: "Name updated" });
  }
  const checkEmail = await checkEmailExists(req.body.email);
  if (checkEmail === true) {
    res.json({ message: "Email already exists" });
  }
  try {
    //@ts-ignore
    await db.collection("users").doc(req.user.email).update(req.body);
    res.json({ message: "User updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteUser: RequestHandler = async (req, res, next) => {
  const { email } = req.body;
  try {
    await db.collection("users").doc(email).delete();
    res.json({ message: "User successfully deleted" });
  } catch (error) {
    next(error);
  }
};

export const addImageAndDescription: RequestHandler = async (req, res, next) => {
  try {
    let { id } = req.params;
    let imgId = uuidv4()
    let { name, description } = req.body;
    await db.collection("mushrooms").doc(name).set({
      id: imgId,
      userId: id,
      name: name,
      description: description,
      images: ["ajajaj.png"]
    });

    res.json({ message: "mushroom successfully created!" });


  } catch (error) {
    next(error);
  }
};

// export const addImage: RequestHandler = async (req, res, next) => {
//   try {

//     let sampleFile;
//     let uploadPath;

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return res.status(400).send('No files were uploaded.');
//     }

//     // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
//     sampleFile = req.files.sampleFile;
//     uploadPath = __dirname + '/somewhere/on/your/server/' + sampleFile.name;

//     // Use the mv() method to place the file somewhere on your server
//     sampleFile.mv(uploadPath, function(err) {
//       if (err)
//         return res.status(500).send(err);

//       res.json({message: 'File uploaded!'});
//     });
//     // const { id } = req.params
//     // const file = req.files.pic
//     // if (!file) {
//     //     throw new InvalidBody(['file'])
//     // }

//     // const findTask = await Task.findOne({ where: { id } })
//     // if (!findTask) { throw new TaskNotFound(id) }
//     //@ts-ignore
//     // const extension = path.extname(req.files.image.name);
//     // const newFileName = uuidv4() + extension;
//     //@ts-ignore
//     // req.files.image.mv(path.join('uploads', newFileName))
//     // const outputPath = path.join("upload_images", newFileName);
//     // file.mv(outputPath, (err) => {
//     //   if (err) return res.status(500).send(err);
//       // Task.update(
//       //     { imageName: newFileName },
//       //     { where: { id } }
//       // );
//       // res.json({ message: "image has added!" });
//     // });
//   } catch (error) {
//     next(error);
//   }
// };
