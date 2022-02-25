import { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ isWhitelisted: boolean }>
) {
  const address = req.body.address;

  const whitelistedAddress = ["0x331e14E9e312A28C816F630215688f7f5eA593Bb"];

  return res.status(200).json({ isWhitelisted: true });
}
