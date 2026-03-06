import { randomBytes } from "node:crypto";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";
const jwtSecret = process.env.JWT_SECRET;
type BootstrapDemoPlan = "essencial" | "pro" | "enterprise";

const parseEmailList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

const VALID_BOOTSTRAP_DEMO_PLANS = new Set<BootstrapDemoPlan>([
  "essencial",
  "pro",
  "enterprise",
]);

const parseBootstrapDemoUsers = (value: string | undefined) =>
  (value ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [rawEmail, rawPassword, rawPlan, ...rawNameParts] = entry
        .split("|")
        .map((part) => part.trim());

      const email = rawEmail?.toLowerCase();
      const password = rawPassword ?? "";
      const plan = (rawPlan ?? "").toLowerCase() as BootstrapDemoPlan;
      const name = rawNameParts.join("|").trim();

      if (!email || !password || !VALID_BOOTSTRAP_DEMO_PLANS.has(plan)) {
        console.warn(
          `[ENV] Ignoring invalid BOOTSTRAP_DEMO_USERS entry: "${entry}". Expected "email|password|essencial|Nome".`
        );
        return [];
      }

      return [
        {
          email,
          password,
          plan,
          name: name || "Conta de Teste GLX",
        },
      ];
    });

const bootstrapTestClientName = process.env.BOOTSTRAP_TEST_CLIENT_NAME?.trim() || "Conta de Teste GLX";
const defaultDevelopmentDemoUsers = [
  {
    email: "cliente@glx.local",
    password: "Cliente123!",
    plan: "essencial" as const,
    name: "Cliente Local GLX",
  },
];

if (isProduction && !jwtSecret) {
  throw new Error("[ENV] Missing JWT_SECRET in production. Set JWT_SECRET before starting the server.");
}

const developmentSecret = `dev-${randomBytes(24).toString("hex")}`;

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: jwtSecret ?? developmentSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  isDevelopment,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  kommoClientId: process.env.KOMMO_CLIENT_ID?.trim() ?? "",
  kommoClientSecret: process.env.KOMMO_CLIENT_SECRET?.trim() ?? "",
  kommoWebhookSecret: process.env.KOMMO_WEBHOOK_SECRET?.trim() ?? "",
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() ?? "",
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "",
  bootstrapTestClientEmails: parseEmailList(process.env.BOOTSTRAP_TEST_CLIENT_EMAILS),
  bootstrapTestClientPassword: process.env.BOOTSTRAP_TEST_CLIENT_PASSWORD ?? "",
  bootstrapTestClientName,
  bootstrapDemoUsers: (() => {
    const parsed = parseBootstrapDemoUsers(process.env.BOOTSTRAP_DEMO_USERS);
    if (parsed.length > 0) return parsed;
    return isDevelopment ? defaultDevelopmentDemoUsers : [];
  })(),
};
