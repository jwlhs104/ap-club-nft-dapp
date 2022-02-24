import { NextApiRequest, NextApiResponse } from "next";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ isWhitelisted: boolean }>
) {
  const address = req.body.address;

  return res.status(200).json({ isWhitelisted: true });
}
