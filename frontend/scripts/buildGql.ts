import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const buildGql = async () => {
  // Step 1: Merge schema files using the backend script with ESM support
  const mergeSchemaScript = path.resolve(
    __dirname,
    "../../backend/scripts/merge-schema-for-appsync.ts",
  );

  console.log("Merging GraphQL schema files...");
  try {
    execSync(`npx tsx ${mergeSchemaScript}`, {
      cwd: path.resolve(__dirname, "../../backend"),
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Schema merge failed:", err);
    throw err;
  }

  // Step 2: Run graphql-codegen
  const schemaPath = path.resolve(
    __dirname,
    "../../backend/combined_schema.graphql",
  );
  const outDir = path.resolve(__dirname, "../../shared/src/types");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Create temporary codegen config
  const tmpConfigPath = path.resolve(__dirname, "../codegen.temp.yml");
  const relativeSchemaPath = path.relative(
    path.resolve(__dirname, ".."),
    schemaPath,
  );

  const yaml = `schema: "${relativeSchemaPath}"
documents:
  - "src/graphql/**/*.ts"
generates:
  ../shared/src/types/gqlTypes.ts:
    plugins:
      - typescript
      - typescript-operations
    config:
      enumsAsTypes: false
      namingConvention:
        enumValues: keep
      skipTypename: true
      maybeValue: T | null
`;

  fs.writeFileSync(tmpConfigPath, yaml, "utf8");

  console.log("Running graphql-codegen...");
  try {
    execSync(`npx graphql-codegen generate --config ${tmpConfigPath}`, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
    });
    console.log("Types generated to shared/src/types/gqlTypes.ts");
  } catch (err) {
    console.error("graphql-codegen failed:", err);
    throw err;
  } finally {
    // Clean up temp config
    try {
      fs.unlinkSync(tmpConfigPath);
    } catch {
      /* ignore */
    }
  }
};

buildGql().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
