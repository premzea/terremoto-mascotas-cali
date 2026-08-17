const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Testing Supabase Connection...");
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key Present:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL or Anon Key is missing in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    const { data, count, error } = await supabase
      .from("pets")
      .select("*", { count: "exact" });

    if (error) {
      console.error("❌ Supabase Query Error:", error);
      process.exit(1);
    }

    console.log("✅ Supabase Connection Successful!");
    console.log(`📊 Total Pets in Database: ${data?.length || 0}`);
    if (data && data.length > 0) {
      console.log("Sample Pet from Supabase:", {
        id: data[0].id,
        name: data[0].name,
        species: data[0].species,
        report_type: data[0].report_type,
        neighborhood: data[0].neighborhood,
      });
    }
  } catch (err) {
    console.error("❌ Unexpected Error:", err);
  }
}

test();
