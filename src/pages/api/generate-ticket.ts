import ethUtil from "ethereumjs-util";
import Web3 from "web3";
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ticket: string; signature: string }>
) {
  const address = req.body.address;
  const ticket = address;

  if (process.env.PRIVATE_KEY) {
    const privateKey = new Buffer(process.env.PRIVATE_KEY, "hex");
    const hash = Web3.utils.soliditySha3(address, "ticketMessage");
    const prefixedHash = ethUtil.hashPersonalMessage(ethUtil.toBuffer(hash));
    const signedMessage = ethUtil.ecsign(prefixedHash, privateKey);
    const signature = ethUtil
      .toRpcSig(signedMessage.v, signedMessage.r, signedMessage.s)
      .toString();

    res.status(200).json({ ticket, signature });
  }

  return res.status(400);
}
