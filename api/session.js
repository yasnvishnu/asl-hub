import { isAdminRequest } from "./_auth.js";

export default function handler(req, res) {
  return res.status(200).json({ authenticated: isAdminRequest(req) });
}
