import { db } from "../db/index";
import bcrypt from "bcryptjs";
// import randomstring from 'randomstring'
import { v4 as uuidv4 } from "uuid";

export const checkEmailExists = async (email: string) => {
  const userRef = db.collection("users");
  const userSnapshot = await userRef.doc(email).get();
  
  if (userSnapshot.data()) {
    return true;
  }

  return false;
};

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
};

export const createId = () => {
  return uuidv4();
};

export const createTemporaryPassword = () => {
  // return "grillkorv";
  return generateString(9);
  // return randomstring.generate(10);
};

export const actionCodeSettings = {
  url: "https://gossip-341510.firebaseapp.com",
  handleCodeInApp: false,
  // iOS: {
  //   bundleId: 'com.example.ios',
  // },
  // android: {
  //   packageName: 'com.example.android',
  //   installApp: true,
  //   minimumVersion: '12',
  // },
  // FDL custom domain.
  // dynamicLinkDomain: 'gossip24.page.link',
};

const generateString = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};