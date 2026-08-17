const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read .env.local
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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load original seed_pets baseline IDs
const seedPets = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "data", "seed_pets.json"), "utf-8"));
const seedIdSet = new Set(seedPets.map(p => p.id));

async function main() {
  console.log(`Original seed database baseline: ${seedPets.length} pets.`);

  // 1. Fetch all pets from Supabase
  const { data: allPets, error } = await supabase
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pets:", error);
    process.exit(1);
  }

  console.log(`Total pets currently in Supabase: ${allPets.length}`);

  // 2. Identify test / non-seed records or records created for testing
  const toDelete = [];
  for (const p of allPets) {
    const isTestName = (p.name || "").toLowerCase().includes("test") ||
                       (p.contact_name || "").toLowerCase().includes("test") ||
                       (p.distinctive_features || "").toLowerCase().includes("test");
    const isTestId = p.id.startsWith("offline-") ||
                     p.id.startsWith("TEST-") ||
                     p.id === "R999_TEST";
    const isBeyondSeedRange = (p.id.startsWith("B") && parseInt(p.id.slice(1), 10) > 107) ||
                              (p.id.startsWith("R") && parseInt(p.id.slice(1), 10) > 146);

    if (isTestName || isTestId || isBeyondSeedRange || !seedIdSet.has(p.id)) {
      toDelete.push(p);
    }
  }

  console.log(`Found ${toDelete.length} test/extra records to delete:`);
  toDelete.forEach(p => {
    console.log(` - ID: ${p.id} | Name: "${p.name}" | Type: ${p.report_type} | Contact: "${p.contact_name}" | Date: ${p.created_at}`);
  });

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(p => p.id);
    const { data: delResult, error: delError } = await supabase
      .from("pets")
      .delete()
      .in("id", idsToDelete);

    if (delError) {
      console.error("❌ Delete error:", delError);
    } else {
      console.log(`✅ Successfully deleted ${toDelete.length} test records from Supabase.`);
    }
  } else {
    console.log("✅ Database is already clean. No test records found.");
  }

  // Final count check
  const { count, error: countErr } = await supabase
    .from("pets")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Final Count in Supabase: ${count} pets (Authoritative real data).`);
}

main().catch(console.error);
