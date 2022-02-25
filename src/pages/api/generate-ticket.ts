import { ethers } from "ethers";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ticket: string; signature: string }>
) {
  const address = req.body.address;
  const tierIndex = req.body.tierIndex;
  const ticket = address;

  if (process.env.PRIVATE_KEY) {
    let wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const messageHash = ethers.utils.solidityKeccak256(
      ["address", "string"],
      [address, ticket]
    );
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    const signature = await wallet.signMessage(messageHashBinary);

    res.status(200).json({ ticket, signature });
  }

  return res.status(400).end();
}
