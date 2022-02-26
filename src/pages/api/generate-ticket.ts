import { ethers, utils } from "ethers";
import firebaseAdmin from "firebase-admin";
import { NextApiRequest, NextApiResponse } from "next";
const serviceAccount = require("../../configs/serviceAccountKey.json");

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: "https://ap-club-nft.firebaseio.com",
  });
} else {
  firebaseAdmin.app();
}

const firestore = firebaseAdmin.firestore();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ticket: string; signature: string | null }>
) {
  const address = req.body.address;
  const tierIndex = req.body.tierIndex;
  const ticket = address;

  const docId = utils.getAddress(address);
  const doc = await firestore.collection("whitelist").doc(docId).get();
  const docData = doc.data();

  if (process.env.PRIVATE_KEY) {
    const tier: number | undefined = docData?.tier;

    if (doc.exists && tier && parseInt(tierIndex) >= tier) {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "string"],
        ["0x0000000000000000000000000000000000000000", ticket]
      );
      const messageHashBinary = ethers.utils.arrayify(messageHash);
      const signature = await wallet.signMessage(messageHashBinary);

      res.status(200).json({ ticket, signature });
    } else {
      return res.status(200).json({ ticket, signature: null });
    }
  }

  return res.status(400).end();
}
