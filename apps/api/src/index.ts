import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

export default app;
