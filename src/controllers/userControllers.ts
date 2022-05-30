import { RequestHandler } from "express";
import { db, authenticate, bucket } from "../db/index";
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
      //     from: '"Enoki" <info@enoki.se>',
      //     to: email,
      //     subject: "Bekräfta din e-postadress till Enoki!",
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
    //   transporter.sendMail({
    //     from: '"Enoki" <info@enoki.se>',
    //     to: email,
    //     subject: "Bekräfta din e-postadress till Enoki!",
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

export const addTitleAndDescription: RequestHandler = async (
  req,
  res,
  next
) => {
  let img = req.files.image;
  //@ts-ignore
  const userId = req.user.id;

  try {
    let imgName = uuidv4();
    let imgId = uuidv4();
    let { title, description } = req.body;
    let fileUpload = bucket.file(imgName);
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        //@ts-ignore
        contentType: img.mimetype,
      },
    });

    blobStream.on("error", (error) => {
      console.log("Something is wrong! Unable to upload at the moment.");
    });

    blobStream.on("finish", () => {
      console.log("Finished");
    });
    //@ts-ignore
    blobStream.end(img.data);

    const response = await db
      .collection("mushrooms")
      .doc(title)
      .set({
        id: imgId,
        userId: userId,
        title: title,
        description: description,
        images: [imgName],
      });
    //@ts-ignore
    console.log(response.data);

    res.json({ message: "mushroom successfully created!" });
  } catch (error) {
    next(error);
  }
};

// export const getMushrooms: RequestHandler =async (req, res, next) => {

//   try {
//     //@ts-ignore
//     let userId = req.user.id
//     const querySnapshot = await db
//       .collection("mushrooms").get();
//     // if (!querySnapshot.data()) {
//     //   throw new UserNotFound();
//     // }

//     res.json({ mushrooms: querySnapshot});

//   } catch (error) {
//     next(error);
//   }
// }

export const getUserImages: RequestHandler = async (req, res, next) => {
  const urlOptions = {
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 2,
  };

  try {
    //@ts-ignore
    let userId = req.user.id;
    const querySnapshot = await db.collection("mushrooms").get();

    // const imageUrl = bucket.get
    // if (!querySnapshot.data()) {
    //   throw new UserNotFound();
    // }
    const mushrooms = querySnapshot.docs.filter(
      (doc) => doc.data().userId === userId
    );
    
    let urls = [];

    for (const file of mushrooms) {
      //@ts-ignore
      let id = file._fieldsProto.images.arrayValue.values[0].stringValue;
      //@ts-ignore
      const [url] = await bucket.file(id).getSignedUrl(urlOptions);
      //@ts-ignore
      file._fieldsProto.images.arrayValue.values[0].urlValue = url;
      urls.push(url);
    }

    // console.log(urls)

    res.json({ mushrooms });
  } catch (error) {
    next(error);
  }
};

export const getRandomMushrooms: RequestHandler = async (req, res, next) => {

  const urlOptions = {
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 2,
  };

  try {
    //@ts-ignore
    if (req.user.id) {
      const querySnapshot = await db.collection("mushroomsData").get();
      let maxNr = querySnapshot.docs.length

      let randNr = Math.floor(Math.random() * (maxNr + 1));
      let randomSvamp = querySnapshot.docs[randNr]
      
      let svampImageId = randomSvamp["_fieldsProto"]["image"]["stringValue"]
      //@ts-ignore
      const [url] = await bucket.file(svampImageId).getSignedUrl(urlOptions);
      console.log(url)
      // res.json({ mushrooms: querySnapshot.docs });
      //@ts-ignore
      randomSvamp.firebaseUrl = url
      res.json(randomSvamp);

    }
  } catch (error) {
    next(error);
  }
};
