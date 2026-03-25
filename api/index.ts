let appPromise: Promise<(req: any, res: any) => any> | null = null;

async function getApp() {
  if (!appPromise) {
    process.env.NODE_ENV = process.env.NODE_ENV || "production";
    appPromise = import("../dist/vercel-app.js").then((mod) => mod.createHttpApp());
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
